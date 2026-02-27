#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "German health app - VitaGuide. Non-medical symptom info tool with AI analysis, nutrition tips, recipes, and Joachim Kaeser affiliate product recommendations."

backend:
  - task: "Symptom Analysis with official application_instructions in supplement_schedule"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "P0 task complete: Scraped official application_instructions from 30 Joachim Kaeser product pages. Added APPLICATION_INSTRUCTIONS dict to server.py. Updated system prompt to v1.2 to use official dosage in supplement_schedule. Enrichment code now passes application_instructions to frontend. Verified via curl - LLM returns correct dosage based on manufacturer info."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: POST /api/symptoms/analyze working correctly. Verified prompt_version 1.2, model gpt-4o, supplement_schedule contains application_instructions field for all items. Analysis stored and retrieved from DB successfully (analysis_id: 032f22cb-2ed8-4173-b08f-d6b79e0916ab). LLM integration functional."

  - task: "Affiliate Click Tracking endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "POST /api/track/click endpoint exists and stores click events in MongoDB. Frontend calls it via trackClick callback."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: POST /api/track/click working correctly. Successfully tracked multiple clicks with proper response format (id, product_id, timestamp). Database storage confirmed."

  - task: "Products API with application_instructions"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "GET /api/products now returns application_instructions field for all 30 products."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: GET /api/products working correctly. All 30 products have application_instructions with actual dosage content (not empty). Tag filtering (e.g., ?tags=gelenke) works correctly and returns 6 products with proper application_instructions."

  - task: "Diary CRUD + Trends"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "Previously tested - all 7 tests passed."

frontend:
  - task: "Results page - Nutrition tab with official instructions"
    implemented: true
    working: "NA"
    file: "frontend/app/results.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added officialInstructionRow display in NutritionTab schedule cards. Shows manufacturer instructions in a styled info box. Updated subtitle to 'Offizielle Anwendungshinweise des Herstellers'."

  - task: "Affiliate click tracking in frontend"
    implemented: true
    working: "NA"
    file: "frontend/app/results.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "trackClick callback calls POST /api/track/click before opening URL. Used on all shop buttons (featured, product cards, schedule links)."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "Symptom Analysis with official application_instructions"
    - "Results page - Nutrition tab with official instructions"
    - "Affiliate click tracking"
    - "Products API with application_instructions"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "P0 task completed: Scraped and integrated official application_instructions for all 30 Joachim Kaeser products. Updated system prompt v1.2 to instruct LLM to use real manufacturer dosage in supplement_schedule. Frontend shows the official instructions in a styled info box on the Nutrition tab. Also verified click tracking endpoint is functional. Please test: 1) Symptom analysis returns correct dosage in supplement_schedule, 2) application_instructions displayed in Nutrition tab, 3) Click tracking works on shop buttons, 4) GET /api/products returns application_instructions."