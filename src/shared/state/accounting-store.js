// ==============================================================================
// JS 1: CENTRAL STATE STORE & RESTAURANT CHART OF ACCOUNTS (BACKBONE)
// Primary general ledger accounts, parent-linked sub-accounts, and settings.
// ==============================================================================
const AccountingStore = {
  companyName: "",

  // ----------------------------------------------------------------------------
  // PRIMARY CHART OF ACCOUNTS (EACH WITH ASSIGNED CURRENCY)
  // ----------------------------------------------------------------------------
  accounts: [
    /* ASSETS */
    { code: "1000", name: "Cash on Hand", currency: "USD", type: "ASSET", desc: "Front counter registers, bar cash floats, and manager petty cash." },
    { code: "1010", name: "Operating Bank Account", currency: "LAK", type: "ASSET", desc: "Primary checking account used for vendor payouts and operational drafts." },
    { code: "1100", name: "Credit Card Receivables", currency: "USD", type: "ASSET", desc: "Settlements receivable from credit card processors and delivery platforms." },
    { code: "1200", name: "Food & Beverage Inventory", currency: "USD", type: "ASSET", desc: "Value of raw kitchen ingredients, dry pantry stock, and cellar bottles." },
    { code: "1500", name: "Commercial Kitchen Equipment", currency: "USD", type: "ASSET", desc: "Fixed investment in ranges, refrigeration, walk-in chillers, and POS units." },

    /* LIABILITIES */
    { code: "2000", name: "Accounts Payable", currency: "USD", type: "LIABILITY", desc: "Trade vendor balances due for food, produce, and beverage supply shipments." },
    { code: "2100", name: "Restaurant Sales & VAT Payable", currency: "LAK", type: "LIABILITY", desc: "Sales tax collected on guest receipts pending statutory government remittance." },
    { code: "2200", name: "Payroll Tax Withholdings", currency: "LAK", type: "LIABILITY", desc: "Employee income tax and social welfare withholdings payable." },
    { code: "2500", name: "Equipment Financing Loan", currency: "USD", type: "LIABILITY", desc: "Commercial financing note for kitchen build-out and appliances." },

    /* EQUITY */
    { code: "3000", name: "Owner's Capital", currency: "USD", type: "EQUITY", desc: "Initial startup funds and partner equity contributed into the restaurant." },
    { code: "3100", name: "Retained Earnings", currency: "USD", type: "EQUITY", desc: "Cumulative business profits reinvested into operations and reserves." },
    { code: "3200", name: "Owner's Drawings", currency: "USD", type: "EQUITY", desc: "Partner distributions and personal drawings taken during the period." },

    /* REVENUE */
    { code: "4000", name: "Food Sales — Dine-in", currency: "USD", type: "REVENUE", desc: "Gross dining room food revenues from seated table service." },
    { code: "4010", name: "Beverage & Coffee Sales", currency: "USD", type: "REVENUE", desc: "Revenues from specialty coffees, alcoholic drinks, and table beverages." },
    { code: "4020", name: "Takeout & Delivery Orders", currency: "USD", type: "REVENUE", desc: "Revenues from off-premise pickups and third-party delivery dispatch." },
    { code: "4100", name: "Catering & Private Dining", currency: "USD", type: "REVENUE", desc: "Revenues from contracted private party buyouts and buffet events." },

    /* EXPENSES */
    { code: "5000", name: "Cost of Goods Sold — Food", currency: "LAK", type: "EXPENSE", desc: "Wholesale purchasing of fresh meats, seafood, dry sauces, and produce." },
    { code: "5010", name: "Cost of Goods Sold — Beverage", currency: "USD", type: "EXPENSE", desc: "Wholesale purchasing of liquors, craft beers, dairy, and coffee beans." },
    { code: "5100", name: "Kitchen & Floor Staff Payroll", currency: "LAK", type: "EXPENSE", desc: "Bi-weekly wages and incentives for chefs, dishwashers, and waitstaff." },
    { code: "5200", name: "Facility Rent & Common Fees", currency: "USD", type: "EXPENSE", desc: "Monthly commercial building lease payments and CAM charges." },
    { code: "5300", name: "Utilities (Power, Gas, Water)", currency: "LAK", type: "EXPENSE", desc: "High-voltage cold storage electric, kitchen stove gas, and water service." }
  ],

  // ----------------------------------------------------------------------------
  // SUB-ACCOUNTS LINKED TO PARENT CODES
  // ----------------------------------------------------------------------------
  subAccounts: [
    { parentCode: "1000", code: "1000-01", name: "Main Dining Register Drawer", desc: "Primary POS register float and daily cash intake." },
    { parentCode: "1000", code: "1000-02", name: "Bar Register Cash Drawer", desc: "Counter float dedicated to cocktail and espresso station." },
    { parentCode: "1000", code: "1000-03", name: "Manager Petty Cash Box", desc: "Emergency cash for local grocery runs and direct store needs." },
    { parentCode: "1010", code: "1010-01", name: "Commercial Checking", desc: "Primary daily checking account for payroll and wire payouts." },
    { parentCode: "1010", code: "1010-02", name: "Tax Reserve Savings", desc: "Dedicated escrow savings for quarterly VAT payments." },
    { parentCode: "1200", code: "1200-01", name: "Proteins & Fresh Seafood", desc: "Refrigerated chicken, beef cuts, pork, and seafood stock." },
    { parentCode: "1200", code: "1200-02", name: "Dry Pantry & Spices", desc: "Rices, dry noodles, imported sauces, and bulk condiments." },
    { parentCode: "1200", code: "1200-03", name: "Beer & Liquor Stock", desc: "Bar bottle reserves and keg cold storage inventory." },
    { parentCode: "4000", code: "4000-01", name: "Lunch Table Service", desc: "Daytime meal sales receipts (11:00 AM – 3:00 PM)." },
    { parentCode: "4000", code: "4000-02", name: "Dinner Table Service", desc: "Evening dining revenue (5:00 PM – 10:30 PM)." },
    { parentCode: "5000", code: "5000-01", name: "Fresh Local Produce", desc: "Daily morning local greens, herbs, and market fruit." },
    { parentCode: "5000", code: "5000-02", name: "Wholesale Meat Supply", desc: "Commercial deliveries from certified butchery distributors." }
  ]
};

