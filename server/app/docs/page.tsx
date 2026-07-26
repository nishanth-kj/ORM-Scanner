import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function DocsPage() {
  return (
    <div className="container mx-auto py-12 px-8 max-w-screen-xl space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">API Documentation</h1>
        <p className="text-xl text-muted-foreground">
          A complete reference of all REST API endpoints for the OMR Scanner web application.
        </p>
      </div>

      <Accordion className="w-full">
        {/* Upload API */}
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-4">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-md text-sm font-bold">POST</span>
              <span>/api/v1/answer-sheet/upload</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 text-base">
            <p>
              Creates a new answer sheet record or updates an existing one if the `registration_number` matches. It automatically processes all student responses associated with the sheet.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">Request Body (JSON)</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
{`{
  "candidate_name": "John Doe",
  "registration_number": "100002437",
  "paper": 1,
  "booklet_version": "A1",
  "booklet_serial_no": "998877",
  "answer_responses": [
    {
      "question_number": 1,
      "user_answer": "A",
      "correct_answer": "B",
      "status": 0
    }
  ]
}`}
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* List API */}
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-4">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-md text-sm font-bold">POST</span>
              <span>/api/v1/answer-sheet/list</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 text-base">
            <p>
              Retrieves a paginated list of all active answer sheets.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">Request Body (JSON)</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>page</code> (optional): Page number (default: 1)</li>
                <li><code>size</code> (optional): Items per page (default: 20)</li>
                <li><code>search</code> (optional): Search query mapping to ID, name, or registration number</li>
                <li><code>sort_by</code> (optional): Field to sort by (default: created_at)</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Get / Update Details API */}
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-4">
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-md text-sm font-bold">POST</span>
              <span>/api/v1/answer-sheet/[answer_sheet_id]</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 text-base">
            <p>
              Retrieves detailed information about a specific answer sheet, or updates its status.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">URL Parameters</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>answer_sheet_id</code> (required): The numeric ID of the answer sheet</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Soft Delete (Optional Body)</h3>
              <p className="text-sm text-muted-foreground">To soft-delete the record, pass this JSON body:</p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
{`{
  "status": 0
}`}
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Answer Key Bulk Upload API */}
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-4">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-md text-sm font-bold">POST</span>
              <span>/api/v1/answer-key</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 text-base">
            <p>
              Bulk uploads answer keys for a specific paper and booklet version. Automatically overrides existing keys for that combination.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">Request Body (JSON)</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
{`[
  {
    "year": 2026,
    "branch": "Civil Engineering",
    "paper": 1,
    "booklet_version": "A1",
    "question_number": 1,
    "question_text": "What is the capital of France?", 
    "option_a": "Berlin", 
    "option_b": "Paris", 
    "option_c": "Rome", 
    "option_d": "Madrid",
    "correct_answer": "B"
  }
]`}
              </pre>
              <p className="text-sm text-muted-foreground mt-2">Note: question_text and options A-D are optional text fields.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Answer Key List API */}
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-4">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-md text-sm font-bold">POST</span>
              <span>/api/v1/answer-key/list</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 text-base">
            <p>
              Retrieves a paginated list of answer keys along with available filter dropdown options.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">Request Body (JSON)</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>page</code> (optional): Page number (default: 1)</li>
                <li><code>size</code> (optional): Items per page (default: 20)</li>
                <li><code>search</code> (optional): Search across booklet or branch</li>
                <li><code>filters</code> (optional): Object with exact matches for <code>year</code>, <code>branch</code>, <code>paper</code>, <code>booklet_version</code></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Response Details</h3>
              <p className="text-sm text-muted-foreground">The response includes the requested records and a <code>filters</code> object containing unique existing values to populate UI dropdowns.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  )
}
