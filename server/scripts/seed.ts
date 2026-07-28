import "dotenv/config";
import { db } from "../lib/db";
import { questionAndAnswer } from "../lib/schema";

// Helper to convert a string of 100 answers into DB rows
function generateRows(branch: string, bookletVersion: string, answers: string) {
  const rows = [];
  for (let i = 0; i < answers.length; i++) {
    rows.push({
      year: 2026,
      branch,
      bookletVersion,
      questionNumber: i + 1,
      questionText: `What is the correct answer for question ${i + 1}?`,
      optionA: "Option A",
      optionB: "Option B",
      optionC: "Option C",
      optionD: "Option D",
      questionImage: null,
      correctAnswer: answers[i],
    });
  }
  return rows;
}

const seedData = [
  // // CIVIL ENGINEERING
  // ...generateRows("Civil Engineering", "A1", "3413242443241313121224113131211132123212212432231433414241233432241333123421344231231422322342422131"),
  // ...generateRows("Civil Engineering", "B1", "3432241333123421344234132424432113212321241131312111321232122124322314334142412334322413331234213442"),
  // ...generateRows("Civil Engineering", "C1", "1132123212241131312111321232122124322314334142412334322413331234213442341324244324131312122411313121"),
  // ...generateRows("Civil Engineering", "D1", "3432241333123421344234132424432413131212241131312111321232122124322314334142412334322413331234213442"),
  
  // // ELECTRICAL STREAM
  // ...generateRows("Electrical Stream", "A1", "1444223411212124214132423324122321221143321321124222333211212311224133413212432311232122324242412411"),
  // ...generateRows("Electrical Stream", "B1", "2121242141144422341132423324122321221143321321124222333211212311224133413212432311232122324242412411"),
  // ...generateRows("Electrical Stream", "C1", "1212421411144422341132423324122321221143321321124222333211212311224133413212432311232122324242412411"),
  // ...generateRows("Electrical Stream", "D1", "1444223411212124214132423324122321221143321321124222333211212311224133413212432311232122324242412411"),

// COMPUTER SCIENCE STREAM
...generateRows(
  "Computer Stream",
  "A1",
  "CDACBDBDACBDACACABBBADACBBCACABBCBAADAAACBCABBCABCABCABCABCBACCABCABCABCBABCACBBADCABCABCBDABBCBDAA"
),

...generateRows(
  "Computer Stream",
  "B1",
  "CDDBBDAACABCADACABDBADBCCDBBADBCACBBBDBABCBBBADBBCABCADABBCBBCCBCCADABCBCDBBBCCADABABBBAADCBBCD"
),

...generateRows(
  "Computer Stream",
  "C1",
  "BABDCCBCCDCBDAAADDCACADBCBADACCCDBBBBACCADACCBDBAADACCDDBADACDDCCACCBCAAAABACCBABCBAABBACCAABDB"
),

...generateRows(
  "Computer Stream",
  "D1",
  "BDAACACACBCACCBBCBBABADBCBCCABBCBCBBCCACABCDBBDACDBBABCADACBCCCDACBCACCCBBCDBABADBDBACBACCAACCB"
),
  // // MECHANICAL STREAM
  // ...generateRows("Mechanical Stream", "A1", "4414112122443341221222313231333432323324211333214244132231344131113421423131313213113114421113234241"),
  // ...generateRows("Mechanical Stream", "B1", "4433412212223132313334323233242113332142441411212244132231344131113421423131313213113114421113234241"),
  // ...generateRows("Mechanical Stream", "C1", "1222313231333432323324211333214244141121224433412244132231344131113421423131313213113114421113234241"),
  // ...generateRows("Mechanical Stream", "D1", "3432323324211333214244141121224433412212223132313344132231344131113421423131313213113114421113234241"),
];

async function runSeed() {
  console.log("🌱 Starting Answer Key Seeding...");

  try {
    // Clear existing data
    await db.delete(questionAndAnswer);
    console.log("Deleted old answer keys.");

    // Insert new seed data
    await db.insert(questionAndAnswer).values(seedData);

    console.log(`✅ Successfully seeded ${seedData.length} answer keys!`);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  }

  process.exit(0);
}

runSeed();
