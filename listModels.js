// C:\Users\Mikaela\FYP-Backend\listModels.js

require("dotenv").config();
const fetch = require("node-fetch");

const listModels = async () => {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error fetching models:", error);
  }
};

listModels();
