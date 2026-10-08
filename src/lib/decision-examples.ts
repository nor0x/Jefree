// Preset requests. The payloads follow Jev's `{state, questions}` shape.
import type { Modality } from './types'

export interface DecisionExample {
  id: string
  label: string
  request: object
  /** File under EXAMPLE_MEDIA used as the state instead of the payload's text. */
  media?: string
}

export interface UserExample extends DecisionExample {
  /** What the situation is, for the example's icon. */
  modality: Modality
  /** Media answer options: question name -> option key -> file under EXAMPLE_MEDIA. */
  optionMedia?: Record<string, Record<string, string>>
}

/** Everyday examples for the Jevfree page. */
export const USER_EXAMPLES: UserExample[] = [
  {
    id: 'dinner',
    label: 'Dinner tonight',
    modality: 'text',
    request: {
      state: "I only have 20 minutes, there's leftover rice, a few eggs and spring onions in the fridge, and I'm exhausted.",
      questions: {
        dish: {
          type: 'choice',
          instructions: 'What should I cook?',
          criteria: {
            'Fried rice': 'A quick stir-fry of cooked rice with egg and vegetables.',
            'Pasta bake': 'Pasta baked in the oven with sauce and cheese.',
            'Big salad': 'A fresh salad of raw vegetables and leaves.',
            'Order takeout': 'Skip cooking and order food from a restaurant.',
          },
        },
        quick: {
          type: 'boolean',
          instructions: 'Can it be done fast?',
          condition: 'The meal can be ready in well under half an hour.',
          false: 'The meal needs a long time to prepare or cook.',
        },
        effort: {
          type: 'score',
          instructions: 'How much energy do I have?',
          rubric: ['1: Drained: Too tired to do anything', '2: Low: Can manage something simple', '3: Okay: Normal energy', '4: Good: Happy to cook', '5: Buzzing: Full of energy'],
        },
      },
    },
  },
  {
    id: 'email',
    label: 'Is this email urgent?',
    modality: 'text',
    request: {
      state:
        'Hi, the client presentation got moved up to 9am tomorrow and the slides still have last quarter’s numbers. Can you send me the updated figures tonight? Thanks, Maya',
      questions: {
        category: {
          type: 'choice',
          instructions: 'What kind of email is this?',
          criteria: {
            Work: 'A colleague or client writing about a job, project or deadline.',
            Personal: 'A friend or family member writing about private life.',
            Newsletter: 'A marketing email, promotion or subscription digest.',
            Scam: 'A suspicious message asking for passwords, money or clicks.',
          },
        },
        needs_reply: {
          type: 'boolean',
          instructions: 'Do I need to reply?',
          condition: 'The sender is asking me to do something or answer them.',
          false: 'The message is only informational and expects no answer.',
        },
        urgency: {
          type: 'score',
          instructions: 'How urgent is it?',
          rubric: ['1: Whenever: No time pressure at all', '2: This week: Should be handled in the next few days', '3: Today: Needs attention today', '4: Right now: Needs action within hours'],
        },
      },
    },
  },
  {
    id: 'movie',
    label: 'Movie night',
    modality: 'text',
    request: {
      state: 'Rainy Sunday, the kids are with us and everyone wants something funny with talking animals.',
      questions: {
        genre: {
          type: 'choice',
          instructions: 'What should we watch?',
          criteria: {
            'Animated comedy': 'A funny cartoon movie for the whole family.',
            Thriller: 'A tense, suspenseful film full of danger.',
            Documentary: 'A factual film about real events or nature.',
            Romance: 'A love story for couples.',
          },
        },
        family_friendly: {
          type: 'boolean',
          instructions: 'Is it okay for children?',
          condition: 'The audience includes young children.',
          false: 'Only adults are watching.',
        },
      },
    },
  },
  {
    id: 'trip',
    label: 'Weekend trip',
    modality: 'text',
    request: {
      state: 'I want to hike, breathe fresh air and see snowy peaks, and I don’t mind a cheap cabin.',
      questions: {
        destination: {
          type: 'choice',
          instructions: 'Where should I go?',
          criteria: {
            Beach: 'Sun, sand and swimming in the sea.',
            Mountains: 'Hiking trails, alpine lakes and snowy peaks.',
            City: 'Museums, restaurants and nightlife.',
            Countryside: 'Quiet villages, farms and rolling fields.',
          },
        },
        budget: {
          type: 'score',
          instructions: 'What budget fits?',
          rubric: ['1: Shoestring: As cheap as possible', '2: Moderate: Comfortable but simple', '3: Treat: Spend a bit more', '4: Luxury: Five-star everything'],
        },
      },
    },
  },
  {
    id: 'review',
    label: 'How did the review feel?',
    modality: 'text',
    request: {
      state: 'Battery lasts forever and the screen is gorgeous, but the speaker crackles at high volume. Still very happy overall.',
      questions: {
        sentiment: {
          type: 'score',
          instructions: 'How positive is the review?',
          rubric: ['1: Furious: Very negative', '2: Disappointed: Mostly negative', '3: Mixed: Neutral or balanced', '4: Pleased: Mostly positive', '5: Delighted: Very positive'],
        },
        topic: {
          type: 'choice',
          instructions: 'What is it mostly about?',
          criteria: {
            'Product quality': 'How well the product itself works.',
            Delivery: 'Shipping, packaging and arrival time.',
            Price: 'Cost and value for money.',
            Support: 'Customer service and help.',
          },
        },
        recommend: {
          type: 'boolean',
          instructions: 'Would they recommend it?',
          condition: 'The reviewer is happy with the product and would recommend it.',
          false: 'The reviewer regrets the purchase and would warn others.',
        },
      },
    },
  },
  {
    id: 'photo',
    label: 'What’s in this photo?',
    modality: 'image',
    media: 'cats.jpg',
    request: {
      questions: {
        scene: {
          type: 'choice',
          instructions: 'What does the photo show?',
          criteria: {
            Pets: 'Animals resting at home.',
            Street: 'A busy city street with cars.',
            Beach: 'A sandy beach by the sea.',
            Food: 'A plate of food on a table.',
          },
        },
        people: {
          type: 'boolean',
          instructions: 'Are there people in it?',
          condition: 'A person is visible in the photo.',
          false: 'There are no people in the photo.',
        },
        cozy: {
          type: 'score',
          instructions: 'How cozy is it?',
          rubric: ['1: Not at all: Cold, busy or chaotic', '2: A little: Somewhat calm', '3: Very: Warm, soft and relaxing'],
        },
      },
    },
  },
  {
    id: 'sound',
    label: 'What am I hearing?',
    modality: 'audio',
    media: 'jfk.wav',
    request: {
      questions: {
        sound: {
          type: 'choice',
          instructions: 'What kind of sound is it?',
          criteria: {
            Speech: 'A person giving a speech or talking.',
            Music: 'Instruments playing a song.',
            Animals: 'Animals barking, meowing or chirping.',
            Traffic: 'Cars, horns and engines.',
          },
        },
        speaking: {
          type: 'boolean',
          instructions: 'Is someone speaking?',
          condition: 'A human voice is speaking words.',
          false: 'No one is speaking; there are only sounds or music.',
        },
      },
    },
  },
  {
    id: 'clip',
    label: 'Vibe of this clip',
    modality: 'video',
    media: 'sea-turtle.mp4',
    request: {
      questions: {
        setting: {
          type: 'choice',
          instructions: 'Where was it filmed?',
          criteria: {
            Underwater: 'Under the sea, in the ocean.',
            City: 'Streets and buildings in a town.',
            Forest: 'Trees and plants in a forest.',
            Desert: 'Dry sand dunes in a desert.',
          },
        },
        energy: {
          type: 'score',
          instructions: 'Calm or exciting?',
          rubric: ['1: Peaceful: Slow, calm and soothing', '2: Lively: Some movement and interest', '3: Thrilling: Fast, intense action'],
        },
      },
    },
  },
  {
    id: 'pick-photo',
    label: 'Which photo fits my mood?',
    modality: 'text',
    request: {
      state: 'I want something cute, soft and cozy to look at after a long day.',
      questions: {
        photo: {
          type: 'choice',
          instructions: 'Which photo fits best?',
          criteria: { Cats: '', Tiger: '', Football: '', 'City street': '' },
        },
      },
    },
    optionMedia: {
      photo: { Cats: 'cats.jpg', Tiger: 'tiger.jpg', Football: 'football-match.jpg', 'City street': 'city-streets.jpg' },
    },
  },
  {
    id: 'pick-sound',
    label: 'Find the matching sound',
    modality: 'text',
    request: {
      state: 'A dog that wants to go for a walk.',
      questions: {
        sound: {
          type: 'choice',
          instructions: 'Which recording matches?',
          criteria: { Barking: '', Meowing: '', Piano: '', Speech: '' },
        },
      },
    },
    optionMedia: {
      sound: { Barking: 'dog_barking.wav', Meowing: 'cat_meow.wav', Piano: 'piano.wav', Speech: 'jfk.wav' },
    },
  },
]

export const DECISION_EXAMPLES: DecisionExample[] = [
  {
    id: 'flight',
    label: 'Flight support',
    request: {
      state: 'Cancel my flight and refund my credit card immediately.',
      questions: [
        {
          name: 'intent',
          type: 'choice',
          instructions: 'What does the customer want?',
          criteria: {
            book_flight: 'The customer wants to book or reserve a new flight.',
            cancel_refund: 'The customer wants to cancel a booking or get their money back.',
            baggage_claim: 'The customer is asking about lost, delayed or damaged baggage.',
          },
        },
        {
          name: 'is_financial',
          type: 'boolean',
          condition: 'The request involves money, payments, refunds or charges.',
          false: 'The request is not about money; it is about travel plans, schedules or luggage.',
          threshold: 0.5,
        },
      ],
    },
  },
  {
    id: 'banking',
    label: 'Banking router',
    request: {
      state: 'Someone stole my card and there are three purchases on my account that I never made!',
      context: 'Customer support router for a mobile banking app.',
      questions: [
        {
          name: 'department',
          type: 'choice',
          instructions: 'Which department should handle this message?',
          criteria: {
            fraud: 'Unauthorized transactions or stolen card.',
            transfers: 'Wire transfer delays or ACH limits.',
            general: 'Branch hours, settings, or general FAQ.',
          },
        },
        {
          name: 'requires_human',
          type: 'boolean',
          condition: 'The issue involves stolen funds or immediate financial risk.',
          false: 'A routine question with no money at risk.',
          threshold: 0.5,
        },
        {
          name: 'severity',
          type: 'score',
          instructions: 'Rate the severity of the customer issue.',
          rubric: [
            '1: Low: Routine informational question',
            '2: Medium: Feature blocked or delayed transaction',
            '3: High: Active account compromise or financial loss',
          ],
        },
      ],
    },
  },
  {
    id: 'image',
    label: 'Image state',
    media: 'cats.jpg',
    request: {
      questions: [
        {
          name: 'scene',
          type: 'choice',
          instructions: 'What does the photo show?',
          criteria: {
            pets: 'Animals resting at home.',
            street: 'A busy city street with cars.',
            beach: 'A sandy beach by the sea.',
            food: 'A plate of food on a table.',
          },
        },
        {
          name: 'has_people',
          type: 'boolean',
          condition: 'A person is visible in the photo.',
          false: 'There are no people in the photo.',
        },
      ],
    },
  },
]
