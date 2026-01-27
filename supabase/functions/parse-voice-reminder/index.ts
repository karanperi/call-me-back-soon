import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  transcript: string;
  timezone: string;
  existingContacts?: Array<{ name: string; phone_number: string }>;
}

interface Medication {
  name: string;
  quantity: number;
  unit: "tablet" | "capsule" | "ml" | "drops" | "puff" | "unit";
  instruction: "none" | "with_food" | "with_water" | "before_meal" | "after_meal" | "empty_stomach" | "before_bed";
}

interface Schedule {
  start_date: string;
  time: string;
  frequency: "once" | "daily" | "weekly";
  recurrence_days_of_week?: number[];
  repeat_until?: string;
  max_occurrences?: number;
}

interface ParsedReminder {
  reminder_type: "quick" | "medication" | "unrelated" | "unclear";
  recipient_name: string | null;
  phone_number: string | null;
  message: string | null;
  medications: Medication[] | null;
  schedule: Schedule | null;
  confidence_score: number;
  clarification_needed: string[];
  rejection_reason?: string;
  additional_time_slots_count: number;
}

// Tool schema for Claude to extract structured data
const reminderExtractionTool = {
  name: "extract_reminder_data",
  description: "Extract structured reminder data from a voice transcript",
  input_schema: {
    type: "object" as const,
    properties: {
      reminder_type: {
        type: "string",
        enum: ["quick", "medication", "unrelated", "unclear"],
        description: "The type of reminder: 'medication' for health/medicine reminders, 'quick' for general reminders, 'unrelated' if not a reminder request, 'unclear' if missing critical info"
      },
      recipient_name: {
        type: ["string", "null"],
        description: "The name of the person to remind (e.g., 'Grandma', 'Dad', 'Mom')"
      },
      phone_number: {
        type: ["string", "null"],
        description: "Phone number if explicitly mentioned in E.164 format"
      },
      message: {
        type: ["string", "null"],
        description: "For quick reminders: the action or message (e.g., 'call Mom', 'pick up groceries')"
      },
      medications: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Medication name, including any special instructions in parentheses (e.g., 'Calpol (crushed)')"
            },
            quantity: {
              type: "number",
              description: "Number of units to take, default to 1 if not specified"
            },
            unit: {
              type: "string",
              enum: ["tablet", "capsule", "ml", "drops", "puff", "unit"],
              description: "Unit of measurement, default to 'tablet' if not specified"
            },
            instruction: {
              type: "string",
              enum: ["none", "with_food", "with_water", "before_meal", "after_meal", "empty_stomach", "before_bed"],
              description: "Special instruction for taking the medication"
            }
          },
          required: ["name", "quantity", "unit", "instruction"]
        },
        description: "For medication reminders: list of medications. Extract FIRST time slot only if multiple times mentioned."
      },
      schedule: {
        type: ["object", "null"],
        properties: {
          start_date: {
            type: "string",
            description: "ISO date string for when to start (YYYY-MM-DD)"
          },
          time: {
            type: "string",
            description: "Time in HH:mm 24-hour format"
          },
          frequency: {
            type: "string",
            enum: ["once", "daily", "weekly"],
            description: "How often to repeat"
          },
          recurrence_days_of_week: {
            type: "array",
            items: { type: "number" },
            description: "Days of week (0=Sun...6=Sat) for weekly reminders or specific day patterns"
          },
          repeat_until: {
            type: "string",
            description: "ISO date string for when to stop repeating"
          },
          max_occurrences: {
            type: "number",
            description: "Maximum number of times to repeat"
          }
        },
        required: ["start_date", "time", "frequency"]
      },
      confidence_score: {
        type: "number",
        description: "Confidence in the extraction (0-1). High (0.8-1.0) if all info clear, Medium (0.5-0.79) if some defaults applied, Low (0-0.49) if significant uncertainty"
      },
      clarification_needed: {
        type: "array",
        items: { type: "string" },
        description: "List of items that need user attention (e.g., 'Phone number not provided', 'Dosage defaulted to 1 tablet')"
      },
      rejection_reason: {
        type: "string",
        description: "For unrelated/unclear: explanation of why it couldn't be parsed"
      },
      additional_time_slots_count: {
        type: "number",
        description: "Number of additional time slots mentioned beyond the first one (0 if only one time mentioned)"
      }
    },
    required: ["reminder_type", "confidence_score", "clarification_needed", "additional_time_slots_count"]
  }
};

function buildSystemPrompt(timezone: string, contacts: Array<{ name: string; phone_number: string }> | undefined): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Calculate day of week for relative date handling
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[today.getDay()];
  
  let contactInfo = "";
  if (contacts && contacts.length > 0) {
    contactInfo = `\n\nKnown contacts for phone number lookup:\n${contacts.map(c => `- ${c.name}: ${c.phone_number}`).join('\n')}`;
  }

  return `You are an AI that extracts structured reminder data from voice transcripts. Today is ${todayStr} (${currentDayName}). User's timezone: ${timezone}.

## Classification Rules:

1. **medication**: Contains medicine/drug names, dosages, health-related reminders (pills, tablets, capsules, injections, etc.)
2. **quick**: General reminders like calls, appointments, tasks, errands - anything without medication
3. **unrelated**: Not a reminder at all (questions, conversations, random speech)
4. **unclear**: Seems like a reminder attempt but missing critical info (no recipient name, no time, etc.)

## Time Parsing:

- "2pm" → "14:00"
- "morning" → "09:00"
- "afternoon" → "14:00"
- "evening" → "18:00"
- "night" or "bedtime" → "21:00"
- "noon" → "12:00"
- "midnight" → "00:00"

## Date Parsing (relative to today ${todayStr}):

- "today" → ${todayStr}
- "tomorrow" → calculate next day
- "next Monday" → calculate the upcoming Monday
- "starting Friday" → calculate the upcoming Friday
- If no date mentioned, default to today

## Frequency Patterns:

- "every day" or "daily" → frequency: "daily"
- "every week" or "weekly" → frequency: "weekly"
- "weekdays only" → frequency: "weekly", recurrence_days_of_week: [1,2,3,4,5]
- "weekends" → frequency: "weekly", recurrence_days_of_week: [0,6]
- "every Tuesday and Thursday" → frequency: "weekly", recurrence_days_of_week: [2,4]
- "for 5 days" → calculate repeat_until
- "until Friday" → set repeat_until to that date
- No repetition mentioned → frequency: "once"

## Medication Instructions:

- "with food" → "with_food"
- "with water" → "with_water"
- "before eating" or "before meal" → "before_meal"
- "after eating" or "after meal" → "after_meal"
- "empty stomach" → "empty_stomach"
- "before bed" or "at bedtime" → "before_bed"
- No instruction → "none"

## Special Cases:

1. **Multiple time slots**: If the user mentions multiple times (e.g., "at 9am and 2pm and 8pm"):
   - Extract ONLY the FIRST time slot for the schedule
   - Set additional_time_slots_count to the number of extra times (e.g., 2 if 3 times total)
   - Add clarification: "X additional time slots were mentioned. Please create separate reminders for those."

2. **Special medication instructions**: Merge into the name:
   - "Calpol crushed" → name: "Calpol (crushed)"
   - "NovoSys dissolved in water" → name: "NovoSys (dissolved in water)"

3. **Preserve exact names**: Keep medication names exactly as spoken. Do NOT correct spelling.

4. **Default values** when not specified:
   - quantity: 1
   - unit: "tablet"
   - instruction: "none"
   - Add these defaults to clarification_needed

5. **Phone number lookup**: If recipient name matches a known contact, use their phone number.${contactInfo}

## Confidence Scoring:

- High (0.8-1.0): Recipient clear, time clear, action/medications clear
- Medium (0.5-0.79): Some ambiguity, defaults applied
- Low (0-0.49): Significant uncertainty

## Rejection Reasons (for unrelated/unclear):

- "This doesn't appear to be a reminder request. Try something like 'Remind [name] to [action] at [time]'"
- "I couldn't identify who this reminder is for. Please include a name."
- "I couldn't determine when this reminder should be sent. Please include a time."`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const { transcript, timezone, existingContacts }: ParseRequest = await req.json();

    if (!transcript || !transcript.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No transcript provided" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Parsing transcript:", transcript);
    console.log("Timezone:", timezone);
    console.log("Contacts:", existingContacts?.length || 0);

    const systemPrompt = buildSystemPrompt(timezone, existingContacts);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: [reminderExtractionTool],
        tool_choice: { type: "tool", name: "extract_reminder_data" },
        messages: [
          {
            role: "user",
            content: `Extract reminder data from this voice transcript:\n\n"${transcript}"`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Claude response:", JSON.stringify(result, null, 2));

    // Extract the tool use result
    const toolUse = result.content?.find((block: { type: string }) => block.type === "tool_use");
    if (!toolUse || !toolUse.input) {
      throw new Error("No tool use response from Claude");
    }

    const parsed: ParsedReminder = {
      reminder_type: toolUse.input.reminder_type || "unclear",
      recipient_name: toolUse.input.recipient_name || null,
      phone_number: toolUse.input.phone_number || null,
      message: toolUse.input.message || null,
      medications: toolUse.input.medications || null,
      schedule: toolUse.input.schedule || null,
      confidence_score: toolUse.input.confidence_score || 0.5,
      clarification_needed: toolUse.input.clarification_needed || [],
      rejection_reason: toolUse.input.rejection_reason,
      additional_time_slots_count: toolUse.input.additional_time_slots_count || 0
    };

    // Look up phone number from contacts if we have a recipient name but no phone
    if (parsed.recipient_name && !parsed.phone_number && existingContacts) {
      const matchedContact = existingContacts.find(
        c => c.name.toLowerCase() === parsed.recipient_name?.toLowerCase()
      );
      if (matchedContact) {
        parsed.phone_number = matchedContact.phone_number;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed,
        raw_transcript: transcript
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-voice-reminder error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
