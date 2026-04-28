# Bid Automation Portal - Project TODO

## Database & Schema
- [x] Create bids table with status tracking (submitted, approved, awarded, lost)
- [x] Create bid_parameters table for wage rates and pricing logic
- [x] Create prevailing_wage_rates table with date/location-based rates
- [x] Create projects table for extracted project details
- [x] Create addendums table for tracking received addendums
- [x] Create follow_up_schedules table for automated reminders
- [x] Create integration_status table for platform health monitoring

## Bid Parameter Management
- [x] Build parameter management interface UI
- [x] Implement wage rate editor (private vs prevailing)
- [x] Create pricing logic calculator (square footage, cleaning, window, waxing costs)
- [x] Add location-based wage rate lookup
- [x] Implement date-based wage rate effective date handling
- [x] Add travel cost assessment module
- [ ] Create parameter import/export from MASTERCOPY_PRIVATE.xlsx

## Bid Tracking & Analytics
- [x] Build bid tracking dashboard with pipeline visualization
- [x] Implement status filters and search
- [x] Create win/loss ratio analytics
- [ ] Add bid history timeline
- [x] Implement follow-up scheduling UI
- [ ] Create automated follow-up trigger logic

## Project Details & Addendum Management
- [ ] Build project details viewer component
- [x] Create addendum log with impact assessment
- [ ] Implement AI-powered addendum analysis
- [x] Add acknowledgment status tracking
- [ ] Create addendum document viewer

## Bid Approval Workflow
- [ ] Build proposal review interface
- [ ] Implement wage rate selection in approval flow
- [ ] Add travel cost inclusion toggle
- [ ] Create proposal preview with calculated costs
- [ ] Implement approval/rejection logic
- [ ] Add comments/notes field for approvers

## Integration Status Monitor
- [x] Build integration status dashboard
- [ ] Implement Outlook connection health check
- [ ] Add PlanCenter NW sync status
- [ ] Add Procore sync status
- [ ] Add BuildingConnected sync status
- [x] Create last-sync timestamp tracking

## Frontend Components & Pages
- [x] Create Dashboard home page with pipeline overview
- [x] Add Setup Parameters button to Dashboard
- [x] Build Parameters management page
- [x] Create Bids tracking page
- [ ] Build Projects details page
- [x] Create Addendums log page
- [ ] Build Approvals workflow page
- [x] Create Follow-up schedule page
- [x] Build Integration status page

## Testing & Deployment
- [x] Write vitest tests for pricing calculations
- [x] Write vitest tests for wage rate lookups
- [x] Write vitest tests for travel cost calculations
- [ ] Write vitest tests for bid status transitions
- [ ] Create comprehensive integration tests
- [x] Save initial checkpoint


## Parameter Entry Feature (UPDATED)
- [x] Build manual entry form for private wage parameters
- [x] Build prevailing wage rates table with add/edit/delete
- [x] Create tRPC procedures for saving parameters
- [x] Create tRPC procedures for saving prevailing wage rates
- [x] Implement validation for all numeric fields
- [x] Add preview/confirmation before saving
- [x] Test manual entry workflow end-to-end


## Bid Pricing Model (PRIORITY - NEEDS REDESIGN)
- [x] Fix pricing calculation: $350/person/day for private wage (not per sqft)
- [x] Add minimum charge: $595/day for private wage projects
- [x] Add prevailing wage minimum: $940.50/person/day
- [x] Allow fractional people (e.g., 1.5 people) in crew configuration
- [x] Make services (waxing, carpet, windows) ADD-ONS to base crew cost
- [x] Add project address field to bid form
- [ ] Calculate travel distance from project address to base location (Vancouver, WA)
- [ ] Implement travel cost assessment (triggers at > 1.5 hours distance)
- [x] Add travel time calculation at $39/person/hr
- [x] Add meal/per diem cost at $50/person/day
- [x] Add hotel/Airbnb cost estimation by location
- [ ] Implement aerial lift detection for buildings > 2 stories
- [ ] Create aerial lift cost sheet integration
- [x] Build prevailing wage scraper for Oregon BOLI website
- [x] Build prevailing wage scraper for Washington LNI website
- [x] Add automatic prevailing wage rate updates
- [ ] Update bid proposal UI to show travel and aerial lift costs


## Bid Proposal Review Feature (NEW)
- [x] Create proposal data structure and schema
- [x] Build tRPC procedures for proposal generation
- [x] Build tRPC procedures for proposal retrieval and updates
- [x] Create proposal review UI component with cost breakdown
- [x] Implement wage rate selection toggle
- [x] Add travel cost display and adjustment
- [x] Add aerial lift cost display and adjustment
- [x] Implement approval/rejection workflow
- [x] Add notes/comments field for approvers
- [x] Create cost summary and total calculation
- [ ] Add proposal history and audit trail
- [x] Write tests for proposal calculations
- [x] Test wage rate switching and cost recalculation


## Outlook Email Integration (NEW)
- [x] Research Outlook API authentication patterns
- [x] Implement Outlook OAuth 2.0 authentication
- [x] Build email monitoring and filtering logic
- [x] Create project data extraction from emails
- [x] Build attachment parsing for project documents
- [x] Create tRPC procedures for Outlook sync
- [ ] Build Outlook connection status UI (PRIORITY)
- [ ] Implement automatic email sync scheduler (PRIORITY)
- [x] Add email parsing tests
- [ ] Test end-to-end Outlook integration (PRIORITY)


## Outlook Email Sending & Automation (NEW)
- [ ] Configure Microsoft OAuth app for eburris@cwminc.com with send permissions
- [x] Implement Outlook email sending capability from company email
- [x] Build email template system for addendum acknowledgments
- [x] Build email template system for bid proposal submissions
- [x] Build email template system for 1-month follow-ups
- [x] Build email template system for 3-week follow-ups
- [x] Build email template system for change order requests
- [x] Implement email scheduling and retry logic

## Project Address & Backend Scheduling (NEW)
- [x] Add project address field to NewBid form
- [x] Store project address in bids table
- [ ] Create address validation and geocoding
- [ ] Calculate distance from base location (Vancouver, WA) to project address
- [ ] Pass address to backend for job scheduling
- [ ] Test address field with sample projects
- [x] Apply database migration for new bid schema

## Proposal PDF Generation (NEW)
- [x] Analyze Info Sheet Excel format structure
- [ ] Create PDF template matching Info Sheet layout (PRIORITY)
- [ ] Implement PDF generation from proposal data (PRIORITY)
- [ ] Add cost breakdown section to PDF (PRIORITY)
- [ ] Add signature/approval section to PDF
- [ ] Test PDF generation with sample proposals (PRIORITY)

## Google Drive Integration (NEW)
- [ ] Set up Google Drive API authentication (PRIORITY)
- [ ] Create shared folder structure for proposals (PRIORITY)
- [ ] Implement automatic proposal upload to Google Drive (PRIORITY)
- [ ] Add folder organization by project/date
- [ ] Implement sharing permissions for team members
- [ ] Add Google Drive link tracking in database

## Scheduled Follow-ups (NEW)
- [x] Implement Node-cron scheduler for follow-ups
- [x] Build 1-month follow-up trigger for awarded projects
- [x] Build 3-week follow-up trigger for non-awarded projects
- [x] Create follow-up email queue system
- [x] Implement retry logic for failed emails
- [x] Add follow-up status tracking to database

## Employee Notifications (NEW)
- [ ] Build employee notification system for awarded projects
- [ ] Create notification email template
- [ ] Implement routing to appropriate team members
- [ ] Add notification status tracking

## Aerial Lift Cost Override (NEW)
- [ ] Add aerial lift cost override field to proposal UI
- [ ] Implement cost recalculation on override
- [ ] Add validation for override values
- [ ] Display override status in cost breakdown

## Platform Integrations (NEW - PRIORITY)
- [x] BuildingConnected scraper for opportunity detection
- [x] PlanCenter NW scraper for opportunity detection
- [x] Procore API integration for opportunity detection
- [x] Unified opportunity detection router with tRPC
- [ ] Real email detection testing with actual Outlook emails
- [ ] Keyword refinement and confidence scoring
- [ ] Attachment parsing for RFQ documents

## Award Status Tracking Dashboard (NEW - PRIORITY)
- [x] Award tracking database schema
- [x] Win/loss tracking UI component
- [x] Win rate calculation and analytics
- [x] Historical data visualization
- [x] Performance analytics dashboard
- [x] Proposal response time tracking
- [x] Pricing effectiveness analysis

## Mobile App Development (NEXT WEEK)
- [ ] Mobile app architecture design
- [ ] React Native or Flutter prototype
- [ ] Bid viewing on mobile
- [ ] Mobile proposal generation
- [ ] Mobile follow-up notifications
- [ ] iOS and Android testing

## Future Enhancements (Backlog)
- [ ] Floor plan analysis and clipping
- [ ] Automated bid proposal generation from floor plans
- [ ] BuildingConnected API integration for bid submission
- [ ] Real-time email sync instead of manual sync
- [ ] Advanced email attachment parsing
- [ ] Scraper performance optimization
- [ ] Caching for platform data
- [ ] Rate limiting for API calls

## Crew Size Estimation (NEW - PRIORITY)
- [x] Add sqft-based crew estimation logic to pricing calculator
- [x] Implement pricing rates: Private $0.27/sqft base, $0.47/sqft waxing, $0.13/sqft carpet
- [x] Implement pricing rates: Prevailing $0.59/sqft base, $1.50/sqft waxing, $0.81/sqft carpet
- [x] Add automatic crew calculation: sqft × rate ÷ $350 (private) or $940.50 (prevailing)
- [x] Add manual crew override capability in form
- [x] Display calculation breakdown to user (sqft × rate = cost, cost ÷ daily_rate = crew)
- [x] Update NewBid form to show crew estimation in real-time
- [x] Write tests for crew estimation with all service combinations

## Distance Calculation & Travel Costs (NEW - COMPLETE)
- [x] Create distance calculation utility using Google Maps API
- [x] Calculate distance from project address to Vancouver, WA base (47990)
- [x] Auto-trigger travel cost assessment for projects > 75 miles
- [x] Implement travel time calculation at $39/person/hour
- [x] Add meal/per diem cost at $50/person/day
- [x] Add hotel/Airbnb cost estimation for overnight trips
- [x] Update NewBid form to show distance and travel costs in real-time
- [x] Write tests for distance calculation accuracy
- [x] Write tests for travel cost calculations

## Additional Services Enhancement (NEW - COMPLETE)
- [x] Update bid schema: add waxingSqft, carpetSqft, windowCount, floorCount, needsAerialLift
- [x] Add window pricing per floor (with aerial lift surcharge for 2nd+ floors)
- [x] Create pricing calculator for partial service sqft (not whole building)
- [x] Add quick-entry fields to NewBid form (waxing sqft, carpet sqft, window count)
- [x] Create "Configure Services" modal for detailed floor-by-floor window breakdown
- [x] Implement aerial lift detection: auto-flag when floors > 1 and exterior windows
- [x] Add aerial lift cost surcharge to pricing calculation
- [x] Display service cost breakdown in bid summary
- [x] Write tests for service sqft pricing calculations
- [x] Write tests for window pricing with aerial lift surcharges


## Bug Fixes (PRIORITY)
- [ ] Fix service costs (windows, waxing, carpet) not adding to bid total
- [ ] Remove manual distance input field - should auto-calculate from address
- [ ] Ensure travel cost auto-calculates when address is entered

## Contractor Information Management (NEW - PRIORITY)
- [ ] Add contractor details table to database (name, company, phone, email, address)
- [ ] Create Contractors management page to add/edit/delete contractors
- [ ] Add contractor selector to NewBid form
- [ ] Auto-populate contractor info when selected
- [ ] Save contractor info with bid for future reference
- [ ] Display contractor info on bid proposals
