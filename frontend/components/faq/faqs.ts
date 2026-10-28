export interface Faq {
  id: string
  question: string
  answer: string[]
}

export interface FaqGroup {
  title: string
  items: Faq[]
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'The program',
    items: [
      {
        id: 'what-is-it',
        question: 'What is RBridge?',
        answer: [
          'RBridge is a second lien that pays a homeowner’s property taxes and homeowner insurance during the first years of a mortgage. While it is funding, the borrower pays only principal and interest on the first lien.',
          'It is offered through participating lenders. RBridge provides the calculation and scenario engine; the lender sets the terms and makes the credit decision.',
        ],
      },
      {
        id: 'who-qualifies',
        question: 'Who qualifies?',
        answer: [
          'Purchase borrowers who put 20% down, so the first lien is 80% of the price. Credit, income and debt are underwritten on the payment after the funding period ends, not only on the lower payment during it.',
        ],
      },
      {
        id: 'what-it-pays',
        question: 'What does the second lien pay for?',
        answer: [
          'Property taxes, homeowner insurance, and any special assessments the program chooses to fund. The servicer pays them from the second lien as they come due during the funding period, which is 60 months in the current program.',
        ],
      },
      {
        id: 'cash-out',
        question: 'Does the borrower receive any cash?',
        answer: ['No. Every draw goes straight to the tax authority or the insurer. Nothing is paid to the borrower.'],
      },
    ],
  },
  {
    title: 'Interest and the cap',
    items: [
      {
        id: 'interest',
        question: 'How is interest charged?',
        answer: [
          'At a fixed rate set by the lender (8.00% is the current placeholder), and only on the amount drawn. Each month’s interest is added to the balance and paid from it by the servicer, so the borrower makes no payment on the second during funding.',
        ],
      },
      {
        id: 'cap',
        question: 'What if taxes and insurance exceed the cap?',
        answer: [
          'The second lien is capped at 10% of the purchase price, and principal plus all accrued interest has to stay inside it. If costs would push the balance past the cap, the draws are reduced so the balance ends the funding period exactly at the cap.',
          'Any taxes or insurance the second lien can no longer cover are paid by the borrower for the remaining months. A scenario run shows when that would happen.',
        ],
      },
      {
        id: 'escrow',
        question: 'How does this fit with an escrow account?',
        answer: [
          'During funding, taxes and insurance are paid from the second lien instead of from monthly escrow deposits. How this works alongside an existing first-lien escrow account is set in the servicing agreement with the participating lender.',
        ],
      },
    ],
  },
  {
    title: 'After the funding period',
    items: [
      {
        id: 'month-60',
        question: 'What happens when the funding period ends?',
        answer: [
          'The borrower starts paying taxes and insurance again, and the second-lien balance has to be settled. There are two options: keep the first lien and amortize the second, or refinance both into one new first.',
        ],
      },
      {
        id: 'option-a-vs-b',
        question: 'How do Option A and Option B compare?',
        answer: [
          'Option A keeps the existing first lien and repays the second over 20 years at the second-lien rate. In the Portland example that adds about $415 a month.',
          'Option B refinances the remaining first-lien balance and the second into one new loan. It makes sense when rates have fallen enough: in the Portland example, the new rate has to be 1.13 points below the current first-lien rate to keep the payment the same.',
        ],
      },
      {
        id: 'pmi',
        question: 'Will a refinance need mortgage insurance?',
        answer: [
          'If the new first is above 80% of the purchase price, yes. In the Portland example the new loan is 83.6% of the price, so mortgage insurance applies (placeholder 0.50% of the loan a year, about $209 a month). With it, the break-even rate drop rises to 1.82 points.',
        ],
      },
    ],
  },
  {
    title: 'Data and disclosures',
    items: [
      {
        id: 'offer',
        question: 'Is this an offer or a commitment to lend?',
        answer: [
          'No. Everything on this site is illustrative. Rates, fees, terms and eligibility are set by the participating lender, and program terms are still subject to lender, investor and compliance review.',
        ],
      },
      {
        id: 'data',
        question: 'How is borrower data handled?',
        answer: [
          'RBridge does not store borrower personal information. A credit union sends only the numbers the engine needs, such as price, rates, tax and insurance amounts, income and debts, under its own reference number. Names, Social Security numbers, addresses and loan files stay in the credit union’s systems.',
          'Every calculation is logged with its inputs, the engine version and a request ID so it can be audited and reproduced.',
        ],
      },
    ],
  },
]
