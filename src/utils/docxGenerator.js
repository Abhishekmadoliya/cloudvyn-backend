import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink,
  AlignmentType, BorderStyle, LevelFormat, TabStopType, TabStopPosition
} from 'docx';

const ACCENT = "1a56db";   // blue for name / section rules
const BLACK = "111111";
const GRAY = "555555";
const LGRAY = "888888";

const HR = (color = "CCCCCC") => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
  spacing: { before: 0, after: 80 }
});

const sectionHeading = (text) => [
  new Paragraph({
    spacing: { before: 220, after: 20 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: BLACK })]
  }),
  HR("DDDDDD")
];

const bullet = (runs) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { before: 30, after: 30 },
  children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 20, font: "Arial", color: BLACK })]
});

const jobHeader = (title, company, period) => new Paragraph({
  spacing: { before: 120, after: 30 },
  tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
  children: [
    new TextRun({ text: title, bold: true, size: 22, font: "Arial", color: BLACK }),
    new TextRun({ text: "  |  ", size: 20, font: "Arial", color: LGRAY }),
    new TextRun({ text: company, size: 20, font: "Arial", color: GRAY }),
    new TextRun({ text: "\t", size: 20, font: "Arial" }),
    new TextRun({ text: period || "", size: 20, font: "Arial", color: LGRAY, italics: true })
  ]
});

const projectHeader = (name, link, period) => new Paragraph({
  spacing: { before: 120, after: 30 },
  tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
  children: [
    new TextRun({ text: name, bold: true, size: 21, font: "Arial", color: BLACK }),
    new TextRun({ text: "\t", size: 20, font: "Arial" }),
    new TextRun({ text: period || "", size: 20, font: "Arial", color: LGRAY, italics: true })
  ]
});

const skillRow = (label, value) => new Paragraph({
  spacing: { before: 40, after: 40 },
  children: [
    new TextRun({ text: label + ": ", bold: true, size: 20, font: "Arial", color: BLACK }),
    new TextRun({ text: value, size: 20, font: "Arial", color: BLACK })
  ]
});

export const generateResumeDocx = async (resumeData) => {
  const children = [];

  // --- NAME & CONTACT ---
  if (resumeData.name) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: resumeData.name, bold: true, size: 40, font: "Arial", color: BLACK })]
    }));
  }

  if (resumeData.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: resumeData.title, size: 24, font: "Arial", color: GRAY })]
    }));
  }

  if (resumeData.contact) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [new TextRun({ text: resumeData.contact, size: 19, font: "Arial", color: GRAY })]
    }));
  }

  // --- SUMMARY ---
  if (resumeData.summary) {
    children.push(...sectionHeading("Summary"));
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: resumeData.summary, size: 20, font: "Arial", color: BLACK })]
    }));
  }

  // --- SKILLS ---
  if (resumeData.skills && resumeData.skills.length > 0) {
    children.push(...sectionHeading("Skills"));
    for (const skill of resumeData.skills) {
      children.push(skillRow(skill.label || "Skill", skill.value || ""));
    }
  }

  // --- EXPERIENCE ---
  if (resumeData.experience && resumeData.experience.length > 0) {
    children.push(...sectionHeading("Experience"));
    for (const exp of resumeData.experience) {
      children.push(jobHeader(exp.title || "", exp.company || "", exp.period || ""));
      if (exp.description) {
        children.push(new Paragraph({
          spacing: { before: 20, after: 30 },
          children: [new TextRun({ text: exp.description, size: 20, font: "Arial", color: GRAY, italics: true })]
        }));
      }
      if (exp.bullets) {
        for (const b of exp.bullets) {
          children.push(bullet(b));
        }
      }
      children.push(new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }));
    }
  }

  // --- PROJECTS ---
  if (resumeData.projects && resumeData.projects.length > 0) {
    children.push(...sectionHeading("Projects"));
    for (const proj of resumeData.projects) {
      children.push(projectHeader(proj.name || "", proj.link || "", proj.period || ""));
      if (proj.description) {
        children.push(new Paragraph({
          spacing: { before: 20, after: 30 },
          children: [new TextRun({ text: proj.description, size: 20, font: "Arial", color: GRAY, italics: true })]
        }));
      }
      if (proj.bullets) {
        for (const b of proj.bullets) {
          children.push(bullet(b));
        }
      }
      children.push(new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }));
    }
  }

  // --- EDUCATION ---
  if (resumeData.education && resumeData.education.length > 0) {
    children.push(...sectionHeading("Education"));
    for (const edu of resumeData.education) {
      children.push(new Paragraph({
        spacing: { before: 60, after: 30 },
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
          new TextRun({ text: edu.degree || "", bold: true, size: 21, font: "Arial", color: BLACK }),
          new TextRun({ text: "\t", size: 20, font: "Arial" }),
          new TextRun({ text: edu.period || "", size: 20, font: "Arial", color: LGRAY, italics: true })
        ]
      }));
      if (edu.institution || edu.details) {
        const eduText = [edu.institution, edu.details].filter(Boolean).join("  ·  ");
        children.push(new Paragraph({
          spacing: { before: 0, after: 30 },
          children: [new TextRun({ text: eduText, size: 20, font: "Arial", color: GRAY })]
        }));
      }
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } }
        }]
      }]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 900, right: 1080, bottom: 900, left: 1080 }
        }
      },
      children
    }]
  });

  return Packer.toBuffer(doc);
};
