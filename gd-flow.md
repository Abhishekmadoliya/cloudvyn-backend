Here's both — prompt architecture first, then the schema.

## Persona agent system prompts

Each AI candidate needs a persona config that's injected into a system prompt template, not one prompt per persona hardcoded — you want this data-driven so you can generate new persona combos per session.

```javascript
const PERSONA_ARCHETYPES = {
  dominant: {
    name: "aggressive/dominant",
    traits: "Speaks confidently, interrupts often, pushes their opinion, tends to take charge of the discussion, low patience for repetition",
    speaking_style: "Short punchy sentences, uses phrases like 'Let me stop you there', 'I disagree completely'",
    urgency_bias: 0.3 // higher = jumps in more readily
  },
  analytical: {
    name: "quiet/analytical",
    traits: "Waits for a natural gap, brings data/structure/frameworks, dislikes interrupting, tends to summarize others' points before adding their own",
    speaking_style: "Structured sentences, often starts with 'Building on what X said...' or 'If we look at this from...'",
    urgency_bias: -0.2
  },
  consensus_builder: {
    name: "agreeable/consensus-builder",
    traits: "Looks for common ground, diffuses conflict, brings quieter members in, avoids direct confrontation",
    speaking_style: "Uses 'I think both sides have a point...', addresses other participants by inferred role, asks questions",
    urgency_bias: -0.1
  },
  contrarian: {
    name: "contrarian",
    traits: "Actively challenges the group consensus, plays devil's advocate, enjoys friction, will push back even on reasonable points",
    speaking_style: "'That sounds good in theory but...', 'Has anyone considered the opposite?'",
    urgency_bias: 0.15
  }
};

function buildPersonaSystemPrompt(persona, topic, stance, transcriptSoFar) {
  return `You are a participant in a live Group Discussion (GD) for a campus placement / job interview panel. 
This is NOT a debate you're trying to "win" alone — it's a group evaluation where panelists are watching how you interact.

TOPIC: "${topic}"
YOUR ASSIGNED STANCE: ${stance}

YOUR PERSONALITY: ${persona.traits}
YOUR SPEAKING STYLE: ${persona.speaking_style}

RULES:
- Speak like a real Indian college student/fresher in a GD — natural, sometimes imperfect English, occasional Hindi-English code-switching is fine.
- Keep each turn to 1-3 sentences. Real GD turns are short — you are NOT giving a speech.
- React to what was ACTUALLY just said. Reference other speakers by name when relevant.
- Stay in character and stance even when challenged, but you CAN concede small points if genuinely persuaded — rigid AI-like consistency looks fake.
- Do not summarize the whole discussion. Do not narrate stage directions. Output ONLY your spoken line.

TRANSCRIPT SO FAR:
${transcriptSoFar}

Give your next spoken contribution to the GD.`;
}
```

## Urgency-scoring call

This runs after every utterance, fired in parallel to all idle agents. Keep it cheap and fast — small model, tiny output, strict JSON.

```javascript
function buildUrgencyPrompt(persona, topic, stance, lastUtterance, transcriptTail, silenceDuration) {
  return `You are deciding whether your GD persona wants to speak right now.

YOUR PERSONALITY: ${persona.traits}
YOUR STANCE ON "${topic}": ${stance}
SECONDS SINCE YOU LAST SPOKE: ${silenceDuration}

LAST THING SAID: "${lastUtterance.text}" — by ${lastUtterance.speaker}

RECENT CONTEXT:
${transcriptTail}

Return ONLY valid JSON, no markdown, no preamble:
{
  "urgency": <float 0.0-1.0, how badly you want to speak right now>,
  "reason": "<agree|disagree|build|change_topic|bring_in_quiet_member|none>",
  "one_line_intent": "<5-8 words on what you'd say, or empty string if urgency is low>"
}

Guidance: urgency should be high if you were directly challenged, if you strongly disagree, or if you haven't spoken in a while and have something relevant. Urgency should be low if you just spoke, if nothing new was said, or if it's not your persona's style to jump in.`;
}
```

**Orchestration loop** (pseudocode, runs server-side per GD room):

```javascript
async function onUtteranceComplete(session, utterance) {
  await appendToTranscript(session, utterance);
  broadcastToRoom(session, utterance); // TTS + WebRTC out

  const idleAgents = session.agents.filter(a => a.id !== utterance.speakerId);

  const urgencyScores = await Promise.all(
    idleAgents.map(agent => 
      callFastModel(buildUrgencyPrompt(agent.persona, session.topic, agent.stance, 
        utterance, getTranscriptTail(session, 6), secondsSinceLastSpoke(agent)))
    )
  );

  const candidates = urgencyScores
    .map((score, i) => ({ agent: idleAgents[i], ...JSON.parse(score) }))
    .filter(c => c.urgency > URGENCY_THRESHOLD)
    .sort((a, b) => b.urgency - a.urgency);

  if (candidates.length === 0) return; // silence, human's turn or natural pause

  const nextSpeaker = candidates[0];
  await delay(randomBetween(300, 900)); // natural reaction time

  const fullResponse = await callGenModel(
    buildPersonaSystemPrompt(nextSpeaker.agent.persona, session.topic, 
      nextSpeaker.agent.stance, getFullTranscript(session))
  );

  await onUtteranceComplete(session, {
    speakerId: nextSpeaker.agent.id,
    speaker: nextSpeaker.agent.persona.name,
    text: fullResponse,
    timestamp: Date.now()
  });
}
```

Cap consecutive turns per agent (`session.agents[i].consecutiveTurns`) and force a "nudge quiet member" injection if any agent's `secondsSinceLastSpoke` exceeds ~90s.

## MongoDB schema

```javascript
// gd_sessions collection
{
  _id: ObjectId,
  userId: ObjectId,
  status: "scheduled" | "active" | "completed" | "abandoned",
  topic: {
    id: ObjectId,           // ref to gd_topics
    text: "Should India adopt a 4-day work week?",
    category: "current_affairs" | "abstract" | "case_study" | "controversial"
  },
  durationSeconds: 600,
  startedAt: Date,
  endedAt: Date,

  participants: [
    {
      type: "human",
      userId: ObjectId,
      name: "Abhishek"
    },
    {
      type: "ai_agent",
      agentInstanceId: "agent_1",   // stable within this session
      archetype: "dominant" | "analytical" | "consensus_builder" | "contrarian",
      stance: "for" | "against" | "neutral",
      voiceId: "aura-1-voice-x",    // TTS voice assignment
      consecutiveTurns: 0
    }
    // 3-5 total, mix of human + ai_agent
  ],

  transcript: [
    {
      turnIndex: 0,
      speakerId: "agent_1" | userId,
      speakerType: "human" | "ai_agent",
      text: "...",
      startMs: 1200,
      endMs: 4800,
      interrupted: false,
      interruptedBy: null
    }
  ],

  metrics: {
    // computed post-session, per participant
    perParticipant: [
      {
        speakerId: ObjectId,
        speakingTimeMs: 45000,
        speakingTimeSharePct: 22.5,
        turnCount: 6,
        interruptionsMade: 2,
        interruptionsReceived: 1,
        avgTurnLengthWords: 28,
        newPointsIntroduced: 3,   // via Claude eval
        pointsBuiltOn: 2,
        agreementShiftsCaused: 1  // did other agents change stance
      }
    ]
  },

  report: {
    generatedAt: Date,
    model: "claude-sonnet-4-6",
    overallScore: 78,           // ties into IRS-style scoring
    strengths: ["Brought quieter members in", "Structured points well"],
    improvementAreas: ["Spoke less than 3 of 4 other participants", "Didn't challenge weak arguments"],
    fullTranscriptSummary: "..." // short, Claude-generated
  },

  createdAt: Date,
  updatedAt: Date
}

// gd_topics collection (separate, reusable across sessions)
{
  _id: ObjectId,
  text: "...",
  category: "current_affairs" | "abstract" | "case_study" | "controversial",
  difficulty: "easy" | "medium" | "hard",
  suggestedStances: ["for", "against"],   // seeds for agent assignment
  tags: ["economy", "policy"],
  usageCount: 0,
  createdAt: Date
}
```

**A few build notes tying back to your stack:**

- Run the orchestration loop as a stateful WebSocket handler (Socket.io, same as your interview product) rather than BullMQ — this needs to be real-time/low-latency, not queued. BullMQ fits better for the *post-session* report generation job.
- Use DeepSeek V4 Flash Free for both persona generation and urgency scoring (cheap, fast, high volume of small calls) and reserve Claude for the final `report` generation only — same cost-tiering logic you're already using elsewhere.
- Start the MVP with **text-only + 3 agents fixed at dominant/analytical/consensus_builder**, no voice, before adding TTS — validates the turn-taking feel cheaply before you burn Deepgram credits on it.

Want the actual Socket.io event contract (client↔server message shapes) next, or the post-session Claude scoring prompt that turns the transcript into that `report` object?