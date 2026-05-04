
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface CarbonData {
  transport: {
    car: number; // km per month
    flights: number; // hours per year
    public: number; // km per month
  };
  energy: {
    electricity: number; // kWh per month
    gas: number; // m3 per month
  };
  food: {
    meatServings: number; // per week
    dairyServings: number; // per week
  };
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: ConversationMessage[] = [];

const systemPrompt = `You are a carbon footprint calculator assistant. Your role is to help users understand and reduce their personal carbon emissions.

When a user provides information about their lifestyle (transportation, energy use, food consumption), you should:
1. Calculate their estimated monthly and annual carbon footprint
2. Provide breakdown by category (transport, energy, food)
3. Compare to average for their region
4. Suggest specific, actionable reduction strategies
5. Ask follow-up questions to gather more detailed information

Use these emission factors:
- Car: 0.21 kg CO2 per km
- Flights: 0.255 kg CO2 per km per person (avg 900km/hour)
- Public transport: 0.089 kg CO2 per km
- Electricity: 0.233 kg CO2 per kWh (world average)
- Natural gas: 2.04 kg CO2 per m3
- Beef: 27 kg CO2 per kg
- Chicken: 6.9 kg CO2 per kg
- Dairy: 3.2 kg CO2 per kg
- Average serving: 150g meat, 200g dairy

Be conversational and encourage users to track their progress.`;

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

function calculateCarbonFootprint(data: CarbonData): {
  monthly: number;
  annual: number;
  breakdown: Record<string, number>;
} {
  // Transport calculations (kg CO2)
  const carEmissions = data.transport.car * 0.21;
  const flightEmissions =
    (data.transport.flights * 900 * 0.255) / 12; // hours to km, convert to monthly
  const publicEmissions = data.transport.public * 0.089;
  const transportTotal = carEmissions + flightEmissions + publicEmissions;

  // Energy calculations (kg CO2)
  const electricityEmissions = data.energy.electricity * 0.233;
  const gasEmissions = data.energy.gas * 2.04;
  const energyTotal = electricityEmissions + gasEmissions;

  // Food calculations (kg CO2 per month)
  const meatEmissions =
    ((data.food.meatServings * 150) / 1000) * 17 * 4.33; // avg 17 kg CO2/kg meat, 4.33 weeks/month
  const dairyEmissions =
    ((data.food.dairyServings * 200) / 1000) * 3.2 * 4.33;
  const foodTotal = meatEmissions + dairyEmissions;

  const monthlyTotal = transportTotal + energyTotal + foodTotal;
  const annualTotal = monthlyTotal * 12;

  return {
    monthly: monthlyTotal,
    annual: annualTotal,
    breakdown: {
      car: carEmissions,
      flights: flightEmissions,
      publicTransport: publicEmissions,
      electricity: electricityEmissions,
      gas: gasEmissions,
      meat: meatEmissions,
      dairy: dairyEmissions,
    },
  };
}

function formatBreakdown(
  breakdown: Record<string, number>
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const [key, value] of Object.entries(breakdown)) {
    formatted[key] = (value as number).toFixed(2) + " kg CO2/month";
  }
  return formatted;
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("🌱 Welcome to the Personal Carbon Footprint Calculator");
  console.log(
    "This tool helps you understand and reduce your environmental impact."
  );
  console.log("Type 'help' for commands, 'exit' to quit.\n");

  // Initial greeting from assistant
  const greeting = await chat(
    "Hello! I want to calculate my carbon footprint and learn how to reduce it. Can you help me?"
  );
  console.log(`Assistant: ${greeting}\n`);

  let sampleData: CarbonData = {
    transport: { car: 500, flights: 4, public: 100 },
    energy: { electricity: 300, gas: 15 },
    food: { meatServings: 7, dairyServings: 14 },
  };

  while (true) {
    const userInput = await question("You: ");

    if (user