// The learning path. Each stage is a small, concrete step up in what you write.
// Edit this file freely: it is the "syllabus" of the app, and Claude reads it
// to decide how strict to be and what to suggest next.

export type Stage = {
  id: number;
  name: string;
  goal: string; // what you are practicing, in plain English
  example: string; // a model of what a good entry looks like at this stage
  starterPrompts: string[]; // ideas for what to write when you have none
};

export const STAGES: Stage[] = [
  {
    id: 1,
    name: "Single words",
    goal: "Name things around you, with der, die or das in front of each noun.",
    example: "der Hund, die Katze, das Haus, der Kaffee",
    starterPrompts: [
      "Name five things on your desk.",
      "Name four animals.",
      "Name three things you eat for breakfast.",
    ],
  },
  {
    id: 2,
    name: "Tiny sentences",
    goal: "Three- or four-word sentences with ist or hat: something is or has something.",
    example: "Der Hund ist groß. Die Katze ist klein. Ich habe einen Hund.",
    starterPrompts: [
      "Describe your pet or a pet you would like.",
      "Say what color three things are.",
      "Say how you feel today.",
    ],
  },
  {
    id: 3,
    name: "Everyday sentences",
    goal: "Simple present-tense sentences with common verbs: ich esse, du gehst, wir lesen.",
    example: "Ich trinke Kaffee. Meine Frau liest ein Buch. Wir wohnen in einem Haus.",
    starterPrompts: [
      "Write what you do every morning.",
      "Write three things your family does on weekends.",
      "Write what you like to eat and drink.",
    ],
  },
  {
    id: 4,
    name: "Questions and no",
    goal: "Ask questions (Wo? Was? Wer?) and say no with nicht and kein.",
    example: "Wo ist mein Buch? Ich habe keine Zeit. Das ist nicht mein Auto.",
    starterPrompts: [
      "Ask a new neighbor three questions.",
      "Write three things you do not like.",
      "Write a short question-and-answer between two people.",
    ],
  },
  {
    id: 5,
    name: "Joining ideas",
    goal: "Connect two ideas with und, aber, oder and denn.",
    example: "Ich lese gern, aber ich schreibe lieber. Es regnet, denn es ist Herbst.",
    starterPrompts: [
      "Compare two seasons.",
      "Write what you want to do today, and what you have to do.",
      "Describe a friend: what they like and what they don't.",
    ],
  },
  {
    id: 6,
    name: "Time and word order",
    goal: "Start sentences with time words (Heute, Morgen, Am Montag) and keep the verb in second place.",
    example: "Heute gehe ich in die Stadt. Am Montag unterrichte ich zwei Kurse.",
    starterPrompts: [
      "Describe your week, day by day.",
      "Write your plans for tomorrow.",
      "Write what you do in the evening.",
    ],
  },
  {
    id: 7,
    name: "Telling the past",
    goal: "Say what happened with the Perfekt: ich habe gelesen, ich bin gegangen.",
    example: "Gestern habe ich einen Film gesehen. Wir sind nach Hause gegangen.",
    starterPrompts: [
      "Write what you did yesterday.",
      "Describe your last trip.",
      "Write about a meal you remember.",
    ],
  },
  {
    id: 8,
    name: "Because and that",
    goal: "Give reasons and report thoughts with weil and dass, verb at the end.",
    example: "Ich lerne Deutsch, weil ich nach Berlin reisen möchte. Ich glaube, dass es morgen regnet.",
    starterPrompts: [
      "Write why you are learning German.",
      "Write three opinions, each starting with Ich glaube, dass ...",
      "Explain why you like your favorite book.",
    ],
  },
  {
    id: 9,
    name: "Little stories",
    goal: "Short paragraphs that tell a story or describe a scene, mixing everything so far.",
    example: "Es war ein kalter Morgen. Die Katze saß am Fenster, weil sie den Vogel sehen wollte ...",
    starterPrompts: [
      "Write a five-sentence fable with an animal.",
      "Describe a place you love so a reader can see it.",
      "Tell a small story about losing something.",
    ],
  },
];

export function getStage(id: number): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
