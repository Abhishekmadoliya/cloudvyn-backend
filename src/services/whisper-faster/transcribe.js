const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function transcribeAudio() {
  const form = new FormData();
  form.append("file", fs.createReadStream("./audio.wav"));

  const res = await axios.post(
    "http://localhost:8000/transcribe",
    form,
    { headers: form.getHeaders() }
  );

  console.log(res.data);
}

transcribeAudio();