/**
 * Generate a 2-4 word summary from a reminder message
 * Examples: "Medication reminder", "Weekly trash", "Doctor appointment"
 */
export function generateMessageSummary(message: string, maxWords = 3): string {
  if (!message?.trim()) return "";
  
  // Clean and normalize the message
  const cleaned = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Common filler words to skip
  const stopWords = new Set([
    'this', 'is', 'a', 'an', 'the', 'your', 'to', 'for', 'and', 'of', 'it',
    'its', 'time', 'please', 'dont', 'do', 'not', 'remember', 'hello', 'hi',
    'hey', 'just', 'that', 'you', 'have', 'take', 'care', 'today', 'now',
    'reminder', 'call', 'calling', 'remind', 'about', 'with', 'be', 'are',
    'was', 'were', 'been', 'being', 'there', 'out'
  ]);
  
  // Priority keywords that indicate the topic
  const priorityKeywords = [
    'medication', 'medicine', 'pills', 'tablet', 'dose', 'prescription',
    'appointment', 'doctor', 'dentist', 'meeting', 'interview',
    'trash', 'garbage', 'recycling', 'bins',
    'exercise', 'workout', 'gym', 'walk', 'run',
    'water', 'hydrate', 'drink',
    'breakfast', 'lunch', 'dinner', 'meal', 'eat', 'food',
    'call', 'phone', 'birthday', 'anniversary',
    'bill', 'payment', 'rent', 'mortgage',
    'laundry', 'dishes', 'clean', 'chores'
  ];
  
  const words = cleaned.split(' ').filter(w => w.length > 1);
  
  // Find priority keywords first
  const foundPriority = words.filter(w => priorityKeywords.includes(w));
  
  // Get meaningful words (not stop words)
  const meaningfulWords = words.filter(w => !stopWords.has(w));
  
  // Build summary: prioritize keywords, then other meaningful words
  const summaryWords: string[] = [];
  
  // Add priority keywords first
  for (const word of foundPriority) {
    if (summaryWords.length < maxWords && !summaryWords.includes(word)) {
      summaryWords.push(word);
    }
  }
  
  // Fill with other meaningful words
  for (const word of meaningfulWords) {
    if (summaryWords.length < maxWords && !summaryWords.includes(word)) {
      summaryWords.push(word);
    }
  }
  
  if (summaryWords.length === 0) {
    // Fallback: just take first few words
    return words.slice(0, maxWords).join(' ');
  }
  
  // Capitalize first letter
  const summary = summaryWords.join(' ');
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}
