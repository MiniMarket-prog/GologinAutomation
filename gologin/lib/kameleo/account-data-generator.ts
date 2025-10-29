// Account data generation utilities for Gmail account creation

interface AccountData {
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: {
    month: string
    day: string
    year: string
  }
  recoveryEmail?: string
}

// Common first names for realistic account generation
const FIRST_NAMES = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Barbara",
  "David",
  "Elizabeth",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Nancy",
  "Daniel",
  "Lisa",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Edward",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Timothy",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
]

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
]

/**
 * Generate random account data for Gmail signup
 */
export function generateAccountData(recoveryEmails?: string[]): AccountData {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]

  // Generate email with random numbers to ensure uniqueness
  const randomNum = Math.floor(Math.random() * 9999)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@gmail.com`

  // Generate strong password
  const password = generatePassword()

  // Generate realistic birth date (18-65 years old)
  const birthDate = generateBirthDate()

  // Select random recovery email if provided
  const recoveryEmail =
    recoveryEmails && recoveryEmails.length > 0
      ? recoveryEmails[Math.floor(Math.random() * recoveryEmails.length)]
      : undefined

  return {
    firstName,
    lastName,
    email,
    password,
    birthDate,
    recoveryEmail,
  }
}

/**
 * Generate a strong password
 */
function generatePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*"

  const allChars = lowercase + uppercase + numbers + symbols

  let password = ""
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest (12-16 characters total)
  const length = 12 + Math.floor(Math.random() * 5)
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

/**
 * Generate a realistic birth date (18-65 years old)
 */
function generateBirthDate() {
  const currentYear = new Date().getFullYear()
  const minAge = 18
  const maxAge = 65

  const year = currentYear - minAge - Math.floor(Math.random() * (maxAge - minAge))
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 28) + 1 // Use 28 to avoid invalid dates

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return {
    month: months[month - 1],
    day: day.toString(),
    year: year.toString(),
  }
}

/**
 * Add random delay to simulate human behavior
 */
export async function randomDelay(min = 500, max = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Type text with human-like delays
 */
export async function humanType(element: any, text: string): Promise<void> {
  for (const char of text) {
    await element.type(char, { delay: Math.floor(Math.random() * 100) + 50 })
  }
}
