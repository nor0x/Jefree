// Preset requests for the Decide view. The payloads follow Jev's `{state, questions}` shape.
export interface DecisionExample {
  id: string
  label: string
  request: object
  /** File under EXAMPLE_MEDIA used as the state instead of the payload's text. */
  media?: string
}

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
