# Project Operating System

## Purpose

This document provides an end-to-end system for planning, delegating, executing, reviewing, delivering, and closing a project. It is designed to create clear accountability, reliable feedback loops, and visible safeguards so work does not fall through the cracks.

For the Kelowna Health & Wellness Navigator initiative, the general controls in Sections 1–16 must be used together with the Fixer-specific requirements in Section 17. If a general process and a safety, privacy, legal, or client-consent control conflict, the stricter control applies.

## 1. Define the Outcome

Create a one-page project brief containing:

- **Objective:** What must be achieved?
- **Deliverables:** What tangible items must exist?
- **Deadline:** When must everything be finished?
- **Scope:** What is included?
- **Non-scope:** What is explicitly excluded?
- **Constraints:** Budget, tools, policies, time, and quality requirements
- **Success measures:** How will success be measured?
- **Final approver:** Who decides that the work is complete?

Do not begin execution until the deliverables and acceptance criteria are understandable.

## 2. Create a Master Task Register

Use a spreadsheet, project board, or document with these fields:

| ID | Task | Owner | Reviewer | Due | Status | Dependency | Deliverable | Acceptance test | Next action |
|---|---|---|---|---|---|---|---|---|---|

Use only these statuses:

- Not started
- Ready
- In progress
- Waiting
- In review
- Changes requested
- Approved
- Blocked
- Complete

Every unfinished task must have:

1. One accountable owner
2. A due date
3. A specific next action
4. A defined output
5. A reviewer or acceptance test

If any one of these is missing, the task is at risk of falling through the cracks.

## 3. Break the Project Into Phases

A reliable default structure is:

1. Discovery
2. Requirements
3. Design or planning
4. Implementation
5. Internal review
6. User or stakeholder review
7. Testing and correction
8. Delivery
9. Documentation and handoff
10. Closeout and follow-up

Turn each phase into tasks that can normally be completed in one or two working days. Break larger items into smaller tasks.

## 4. Map Dependencies

For every task, identify:

- What must happen before it starts
- What work depends on its completion
- What information or access it requires
- Who can unblock it
- What happens if it is delayed

Mark the project's critical path: the chain of tasks whose delay would move the final deadline.

Do not delegate a task until its prerequisites are ready, or explicitly assign collection of those prerequisites as part of the task.

## 5. Assign Responsibility

Use four roles:

- **Owner:** Produces the deliverable
- **Reviewer:** Checks it against the acceptance criteria
- **Approver:** Accepts the result or makes the final decision
- **Informed:** Needs the outcome but does not control it

Only one person should be the accountable owner of each task. Several people may contribute, but shared accountability often becomes no accountability.

## 6. Delegate With a Complete Task Packet

Every delegated task should include:

```text
Task:
Purpose:
Expected deliverable:
Relevant context:
Files, links, or source material:
Requirements:
Out of scope:
Dependencies:
Deadline:
Progress checkpoint:
Acceptance criteria:
Reviewer:
Escalation contact:
```

Ask the assignee to confirm:

- Their understanding of the expected result
- Whether they have the necessary access and information
- Their expected completion time
- Any risks or dependencies they already see

Delegation is not complete until that confirmation arrives.

## 7. Use Staged Delegation

Delegate according to risk:

- **Low risk:** Delegate the entire task and review the finished output.
- **Medium risk:** Review an outline, sample, or early draft before completion.
- **High risk:** Approve the proposed approach before work begins, then review at defined milestones.
- **Irreversible or externally visible:** Require explicit approval before execution.

For unfamiliar contributors, begin with a small, verifiable task before assigning critical work.

## 8. Establish Feedback Loops

### Daily Execution Loop

Each owner reports:

```text
Completed:
Next:
Blocked by:
Decision needed:
Expected completion:
```

A report of “working on it” is insufficient. Require evidence such as a draft, commit, screenshot, calculation, test result, or document.

### Deliverable Review Loop

1. The owner submits the deliverable.
2. The reviewer compares it with the acceptance criteria.
3. The reviewer records specific findings.
4. The owner corrects the findings.
5. The reviewer verifies the corrections.
6. The approver accepts the result.

Review comments should state:

- Location of the issue
- What is wrong or missing
- Required outcome
- Severity
- Who owns the correction
- Correction deadline

### Stakeholder Loop

At agreed milestones:

1. Demonstrate the current result.
2. Ask whether it solves the intended problem.
3. Record decisions and requested changes.
4. Separate defects from new scope.
5. Update the plan, owner, and deadline.

### Improvement Loop

At the end of each phase, ask:

- What worked?
- What failed or caused delay?
- What remains unclear?
- What should change in the next phase?
- Which new risks appeared?

Turn each agreed improvement into an assigned task.

## 9. Control Decisions and Changes

Maintain two logs.

### Decision Log

```text
Decision ID:
Date:
Question:
Decision:
Reason:
Decision-maker:
Affected tasks:
Review date, if temporary:
```

### Change Log

```text
Change requested:
Requested by:
Reason:
Scope impact:
Schedule impact:
Cost or resource impact:
Risk impact:
Approved or rejected by:
Tasks updated:
```

Do not quietly absorb new requests. Determine whether each request is:

- A defect
- A clarification
- A required compliance change
- A new scope item

New scope requires an explicit decision about time, resources, or reduced scope elsewhere.

## 10. Manage Blockers and Risks

Maintain a risk register:

| Risk | Probability | Impact | Prevention | Contingency | Owner | Trigger |
|---|---|---|---|---|---|---|

Use this escalation schedule unless the project needs something stricter:

- **Minor blocker:** Owner attempts resolution.
- **Blocked for one working day:** Notify the project lead.
- **Deadline threatened:** Escalate immediately.
- **Approval, security, legal, financial, or irreversible issue:** Stop and obtain authorization.

A blocked task must record:

- The exact blocker
- What has already been attempted
- Who can resolve it
- The next escalation time
- Any work that can continue in parallel

## 11. Protect Quality

Define “done” for every deliverable. A useful general definition is:

- Requirements satisfied
- Acceptance tests passed
- Reviewer findings resolved
- Relevant edge cases tested
- No unresolved critical issues
- Documentation updated
- Decisions recorded
- Approver acceptance captured
- Final location and version recorded

“Created” and “sent” do not mean “complete.”

## 12. Run Milestone Gates

At the end of every phase, hold a gate review.

Confirm:

- Required deliverables exist
- Acceptance criteria passed
- Critical issues are resolved
- Remaining issues have owners and deadlines
- Dependencies for the next phase are ready
- Risks and assumptions are current
- Stakeholder approval is documented

The gate outcome must be one of:

- Approved to proceed
- Approved with named conditions
- Rework required
- Paused pending a decision

## 13. Use a Regular Meeting Rhythm

A lightweight schedule:

- **Daily:** 5–10 minute execution update
- **Weekly:** Task, risk, deadline, and dependency review
- **At milestones:** Demonstration and approval
- **After major problems:** Root-cause review
- **At completion:** Acceptance and lessons-learned review

Every meeting ends with written:

- Decisions
- Action items
- Owners
- Deadlines
- Open questions
- Next review date

Avoid creating meeting notes that are disconnected from the master task register. Transfer every action into the register.

## 14. Create an Exception Report

At least weekly, identify:

- Overdue tasks
- Tasks due soon without evidence of progress
- Blocked tasks
- Items waiting for approval
- Deliverables returned for correction
- Tasks without owners
- Tasks without next actions
- Dependencies that are late
- Risks whose triggers have occurred
- Decisions past their required date

This report is the primary “nothing falls through the cracks” mechanism.

## 15. Prepare Delivery and Handoff

Before delivery, assemble:

- Final deliverables
- Supporting files
- Instructions for use
- Known limitations
- Outstanding non-critical items
- Ownership after handoff
- Maintenance process
- Access and permission information
- Recovery or rollback instructions, when relevant
- Final test evidence
- Approval record

Ask the recipient to confirm that they:

- Received everything
- Can access and use it
- Understand ongoing responsibilities
- Accept the deliverable

## 16. Close the Project Properly

A project is complete only when:

- All required deliverables are approved
- Remaining tasks are completed, cancelled, or transferred
- Final documentation is stored
- Ownership is transferred
- Temporary access is removed where appropriate
- Costs and commitments are reconciled
- Lessons learned are recorded
- Follow-up dates are scheduled
- Stakeholders receive a closure notice

Schedule a later outcome review, often two to four weeks afterward, to confirm that the delivered work produced the intended result.

## 17. Kelowna Health & Wellness Fixer Implementation Standard

### 17.1 Operating Concept and Initial Market

The service is a trusted, non-clinical health and wellness navigation and coordination service. It helps clients clarify an overwhelming situation, research appropriate support, arrange approved logistics, prepare questions, organize information, and follow through.

The initial market is busy adults coordinating care for themselves or an aging parent in Kelowna, including adult children living outside the Okanagan.

Before launch:

- [ ] Choose and approve the public-facing title.
- [ ] Approve the one-sentence promise.
- [ ] Define where the word “fixer” may and may not appear.
- [ ] Confirm the initial niche and geographic boundary.
- [ ] Interview 10–15 prospective clients or caregivers.
- [ ] Interview 8–10 local professionals about gaps and referral boundaries.
- [ ] Document the evidence supporting the launch decision.

Do not collect unnecessary personal or health information during discovery interviews.

### 17.2 Non-Clinical Scope and Boundaries

The service may:

- Conduct structured intake and clarify client goals, constraints, budgets, accessibility needs, and deadlines.
- Research regulated professionals, community services, recreation, transportation, meals, home support, and other practical options.
- Verify professional credentials using relevant public registers.
- Produce action plans with priorities, owners, dates, costs, and backup options.
- Book appointments with the client's informed permission.
- Prepare questions for the client to ask qualified providers.
- Attend appointments as a note-taker or support person when the client and provider consent.
- Organize client-supplied records and provider contacts.
- Coordinate non-clinical logistics and consent-based family updates.
- Track progress, identify barriers, and revise approved plans.

The service must not, unless separately licensed and insured:

- Diagnose, clinically assess symptoms, prescribe, recommend medication changes, or provide treatment.
- Perform restricted health activities or imply registration with a professional college.
- Use protected professional titles or present personal opinions as clinical advice.
- Guarantee access, appointment availability, recovery, or health outcomes.
- Make decisions for a capable client or pressure consent.
- Conceal financial relationships or accept undisclosed referral compensation.
- Operate as an emergency or crisis service.

Required control:

- [ ] Create one approved “What I do / What I do not do” source document.
- [ ] Apply the same boundaries to the website, intake script, agreement, marketing, staff handbook, and referral materials.
- [ ] Have the scope reviewed by a qualified B.C. lawyer and the insurance broker.
- [ ] Re-review the scope whenever services, staffing, geography, or marketing claims change.

### 17.3 Service Packages and Commercial Rules

The initial service catalogue should address:

- Clarity Session
- Two-Week Fix
- Ongoing Concierge
- Family Update add-on

For every offer, define:

- Deliverables and exclusions
- Included hours and overage rates
- Response times and communication channels
- Delivery timeline
- Cancellation and refund rules
- Third-party expense process
- Closeout condition

Commercial controls:

- [ ] Charge for time, coordination, and deliverables—not medical outcomes.
- [ ] Require written approval for out-of-scope work and third-party costs.
- [ ] Separate third-party expenses from service fees.
- [ ] Do not promise 24/7 coverage.
- [ ] Use a defined reduced-fee policy instead of ad hoc discounting.
- [ ] Review actual hours and effective hourly revenue after every pilot.

### 17.4 Controlled Client Journey

Every engagement must follow this sequence:

1. Record the inquiry while collecting minimal personal information.
2. Conduct the fit call and make a documented scope decision.
3. Screen for immediate safety or medical concerns before continuing the sales process.
4. Explain the service package, fees, limits, response times, and communications rules.
5. Obtain the signed service agreement, privacy notice, consent, communications permissions, and required third-party authorizations.
6. Complete structured intake and confirm goals, budget, deadlines, risks, accessibility needs, and approved contacts.
7. Research options and verify credentials where regulated providers are involved.
8. Present the written action plan, choices, costs, risks, responsibilities, and backups.
9. Obtain client approval before coordinating services or incurring costs.
10. Track actions, dates, expenses, decisions, permissions, and unresolved items.
11. Send agreed updates only to approved recipients.
12. Obtain approval before material changes in scope or cost.
13. Provide the final summary, provider list, open items, and maintenance guidance.
14. Confirm retention, return, or secure destruction of records.
15. Obtain feedback and formally close or renew the engagement.

The client remains the decision-maker. Silence is not consent or approval.

### 17.5 Safety, Safeguarding, and Incident Control

The documented protocol must include:

- **Immediate danger or medical emergency:** Call 9-1-1.
- **Suicide crisis or concern:** Call or text 9-8-8; use 9-1-1 when safety is immediately at risk.
- **Non-emergency health information:** Direct the client to HealthLink BC at 8-1-1 or an appropriate licensed provider.
- **Possible abuse, neglect, exploitation, impaired capacity, or unsafe living conditions:** Record objective facts, do not personally investigate, follow applicable reporting duties, and obtain appropriate professional guidance.
- **Symptoms and treatment questions:** Do not interpret; help the client reach a qualified clinician.

Operational controls:

- [ ] Put the protocol in the agreement, intake form, website footer, and staff handbook.
- [ ] Publish service hours and an after-hours message.
- [ ] Maintain an incident and near-miss log.
- [ ] Review every incident within 48 hours.
- [ ] Assign corrective actions, owners, deadlines, and verification.
- [ ] Run a tabletop safety exercise before launch and quarterly afterward.

Safety, safeguarding, legal, privacy, financial, and irreversible issues stop the affected work and escalate immediately.

### 17.6 Privacy, Consent, Security, and Ethics

Minimum operating standard:

- [ ] Appoint a privacy lead.
- [ ] Obtain qualified B.C. privacy review of the actual workflow, forms, systems, and vendors.
- [ ] Collect only information necessary for the agreed purpose.
- [ ] Record meaningful consent, authorized recipients, purpose, and expiry or withdrawal where applicable.
- [ ] Use business-owned accounts and devices.
- [ ] Require strong unique passwords, multi-factor authentication, encryption, and role-based access.
- [ ] Keep health details out of ordinary text messages where possible.
- [ ] Establish retention, return, and secure-destruction schedules.
- [ ] Establish breach, complaint, access-request, and correction procedures.
- [ ] Prohibit recording without everyone's express permission.
- [ ] Prohibit identifiable client health information in consumer AI tools.
- [ ] Record and disclose affiliations, gifts, commissions, and conflicts.
- [ ] Prefer no referral commissions.
- [ ] Review and remove access promptly when a worker or contractor changes roles or leaves.

Before launch, run a fictional-client walkthrough from inquiry through record destruction and a simulated privacy breach. Correct and retest every material finding.

### 17.7 Provider and Partner Network

Build a curated directory across the categories defined in the Fixer Plan. Aim for at least three choices per category where practical.

For each provider or partner, record:

- Exact service and intended client fit
- Current registration or licence where applicable
- Insurance and business licence where relevant
- Pricing and cancellation rules
- Wait time and referral requirements
- Location, parking, transit, virtual options, and accessibility
- Languages and cultural-safety considerations
- Privacy and communication practices
- Conflicts, affiliations, or financial relationships
- Date, source, and person responsible for verification
- Privacy-minimized client feedback

Controls:

- [ ] Verify credentials before the first referral.
- [ ] Review every active entry at least quarterly.
- [ ] Mark stale entries unavailable until reverified.
- [ ] Explain selection criteria and let the client choose.
- [ ] Do not call a provider “the best” or operate a pay-to-play ranking.

### 17.8 Business Readiness and Hard Launch Gate

No paying client may be accepted until every critical requirement below is complete and evidenced:

- [ ] Business name and structure are registered.
- [ ] The correct City of Kelowna business licence and any applicable home or mobile requirements are confirmed.
- [ ] Commercial general liability, errors-and-omissions, cyber/privacy, and relevant vehicle insurance are active and accurately describe the work.
- [ ] A qualified B.C. lawyer has reviewed the scope, agreement, disclaimers, consent, authorizations, cancellation terms, and liability provisions.
- [ ] An accountant has reviewed GST, bookkeeping, expenses, payment handling, and worker classification.
- [ ] A separate bank account and bookkeeping process are operational.
- [ ] Secure business email, domain, telephone, password management, devices, and file storage are operational.
- [ ] Privacy, retention, breach, complaint, incident, safeguarding, conflict, and emergency policies are approved.
- [ ] Intake, action map, incident, progress update, expense approval, and closeout templates are ready.
- [ ] Relevant privacy, first-aid, mental-health, trauma-informed, cultural-safety, accessibility, and boundary training is completed or scheduled according to professional advice.
- [ ] Service packages, pricing, response times, communication limits, and overage rules are approved.
- [ ] The provider-verification process and initial directory are ready.
- [ ] A fictional-client tabletop test has passed and all material findings have been corrected and rechecked.

Training does not expand the legal scope of service.

The project lead records gate evidence, the reviewer verifies it, and the final approver signs the launch decision. Conditional approval is not permitted for unresolved safety, legal, insurance, consent, privacy, or licensing requirements.

### 17.9 Marketing and Referral Controls

Required credibility materials:

- [ ] Core positioning statement
- [ ] “What I do / What I do not do” sheet
- [ ] Accurate founder biography
- [ ] Anonymized sample action map
- [ ] Privacy and conflict statements
- [ ] Clear pricing and response times
- [ ] Professional referral sheet
- [ ] Privacy-safe testimonial consent process

Marketing must not use fear, medical claims, guaranteed outcomes, invented scarcity, overstated qualifications, or testimonials that expose sensitive information.

Build referral relationships with appropriate legal, financial, clinical, caregiver, seniors', employer, relocation, community, cultural, Indigenous, and newcomer organizations, subject to their policies and the service's non-clinical boundaries.

### 17.10 Ninety-Day Launch and Feedback Plan

#### Days 1–30: Define and Protect

- [ ] Complete prospective-client and professional interviews.
- [ ] Finalize niche, title, positioning, and offers.
- [ ] Confirm licensing, insurance, legal, accounting, and privacy requirements.
- [ ] Draft client agreements, consent forms, intake, action map, incident form, progress report, and closeout summary.
- [ ] Build at least 10 provider categories with a target of three verified options per category.

**Gate:** Do not accept paying clients until Section 17.8 passes.

#### Days 31–60: Pilot

- [ ] Run 3–5 paid pilots at a clearly disclosed introductory rate.
- [ ] Limit each pilot to one defined outcome and two weeks.
- [ ] Track hours, questions, handoff failures, privacy risks, incidents, near misses, and provider response times.
- [ ] Conduct a closeout interview after every pilot.
- [ ] Convert every finding into an owner, action, deadline, and verification step.
- [ ] Revise packages, pricing, templates, and controls.
- [ ] Launch an accessible website and referral sheet after required reviews.

#### Days 61–90: Build Referrals

- [ ] Meet 20 potential referral partners.
- [ ] Deliver one educational session.
- [ ] Publish three useful local guides without clinical recommendations.
- [ ] Request privacy-safe testimonials or referrals where appropriate.
- [ ] Review financial results and select the offer to emphasize.

**Ninety-day target:** Five completed clients, three recurring clients, 10 active referral relationships, and a documented process demonstrated to operate safely and repeatedly.

### 17.11 Months 4–12 Growth Controls

- [ ] Stabilize the mix of one-off and recurring services before expanding.
- [ ] Review provider listings quarterly and credentials before each first referral.
- [ ] Complete privacy and security due diligence before adding a client portal.
- [ ] Establish a quarterly advisory circle with clinical, privacy/legal, caregiver, and accessibility perspectives.
- [ ] Define workload limits and activate a wait-list before quality declines.
- [ ] Add an assistant only after workflows, access controls, contracts, supervision, and training are mature.
- [ ] Expand geography or corporate services only after the Kelowna operation is safe and profitable.

Each expansion is a new project gate requiring scope, risk, insurance, legal, privacy, capacity, financial, and quality review.

### 17.12 Financial Controls

- [ ] Replace planning assumptions with pilot evidence.
- [ ] Track revenue, taxes, insurance, professional fees, software, marketing, travel, unpaid administration, and contractor costs.
- [ ] Track actual hours and effective hourly revenue for every package.
- [ ] Maintain a target reserve of at least three months of operating expenses.
- [ ] Take advance payment for fixed packages and invoice retainers monthly where professionally approved.
- [ ] Keep third-party expenses separate from service fees.
- [ ] Do not hold client funds for provider payments without legal, accounting, insurance, and operational-control approval.
- [ ] Review operating margin, cash runway, and client concentration monthly.

The initial financial model is a planning scenario, not a forecast or promise.

### 17.13 Fixer Scorecard

Review monthly:

- Qualified inquiries and sources
- Fit-call-to-client conversion
- Average revenue and actual hours per engagement
- Effective hourly revenue by package
- Percentage of actions completed by the agreed date
- Client-reported coordination burden before and after service
- Repeat and referral rate
- Active referral relationships
- Provider entries verified within the previous 90 days
- Complaints, incidents, near misses, privacy events, and conflicts
- Client concentration and founder capacity
- Operating margin and cash runway
- Overdue tasks, decisions, approvals, findings, and dependencies

Measure coordination quality, clarity, access, timeliness, and client experience. Do not claim health outcomes as results of the service.

### 17.14 Fixer Delegation and Review Map

| Workstream | Accountable owner | Required support or review | Feedback loop |
|---|---|---|---|
| Positioning and offers | Founder | Prospective clients and referral partners | After interviews and every pilot |
| Legal scope and contracts | Founder | Qualified B.C. lawyer | Before launch and when scope changes |
| Insurance | Founder | Licensed insurance broker | Before launch and when services change |
| Privacy and security | Privacy lead | Qualified privacy and technology support | Pre-launch test and quarterly review |
| Accounting and finance | Founder | Accountant or bookkeeper | Monthly close and quarterly forecast |
| Safety and safeguarding | Founder | Appropriate qualified advisors | Incident review within 48 hours; quarterly test |
| Provider network | Network owner | Public registers and provider contacts | First-referral and quarterly verification |
| Client engagement | Assigned navigator | Founder or designated reviewer | Weekly review and formal closeout |
| Marketing and referrals | Founder or marketing owner | Legal/privacy review where needed | Monthly conversion and claims review |
| Master task register | Project lead | All owners and reviewers | Daily exceptions and weekly governance review |

Delegation does not transfer accountability from the named owner. Professional review must be performed by an appropriately qualified person; it must not be replaced by internal approval.

### 17.15 Fixer Feedback and Escalation Loop

1. Each owner reports completed work, evidence, next action, blockers, decisions required, and expected completion.
2. The project lead updates the master register and exception report.
3. The reviewer checks the deliverable against its acceptance criteria.
4. Every finding receives a severity, owner, due date, correction, and verification step.
5. Client scope and cost changes require informed approval before work proceeds.
6. Safety, safeguarding, legal, privacy, licensing, insurance, financial, or irreversible concerns pause affected work and escalate immediately.
7. Incidents are reviewed within 48 hours; systemic findings are added to policies, training, templates, and tests.
8. Weekly governance reviews overdue work, blockers, missing owners, missing next actions, unresolved findings, dependencies, and pending decisions.
9. Monthly governance reviews the full Fixer scorecard, risks, incidents, capacity, finances, complaints, and upcoming gates.
10. Quarterly governance reviews provider verification, privacy and security, advisory feedback, workload limits, and whether growth remains safe.

## Non-Negotiable Safeguards

Use these rules throughout:

1. Every task has one owner.
2. Every unfinished task has a next action and date.
3. Every deliverable has acceptance criteria.
4. Every handoff requires confirmation.
5. Every review finding remains open until verified.
6. Every blocker has an escalation time.
7. Every decision is recorded.
8. Every scope change is assessed and approved.
9. Every meeting action enters the master register.
10. Every completed task includes evidence.
11. Silence is not approval.
12. “Almost done” is not a status—name what remains.

## Quick-Start Checklist

- [ ] Write and approve the project brief.
- [ ] List every known deliverable.
- [ ] Break deliverables into manageable tasks.
- [ ] Assign one owner and a reviewer to every task.
- [ ] Add due dates, dependencies, acceptance criteria, and next actions.
- [ ] Identify the critical path and major risks.
- [ ] Establish daily and weekly review rhythms.
- [ ] Open decision, change, and risk logs.
- [ ] Review exceptions every week.
- [ ] Require evidence before marking tasks complete.
- [ ] Run a gate review at the end of every phase.
- [ ] Obtain documented final acceptance.
- [ ] Complete handoff and schedule the outcome review.

## Final Principle

This system scales from a personal project to a multi-team program. The number of tasks, reviewers, and milestone gates may change, but accountability should remain consistent: every open item needs an owner, a next action, a due date, and a verifiable completion condition.
