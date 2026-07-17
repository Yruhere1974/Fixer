# Application Improvements for a White-Glove Service

## Purpose

This document reviews the Fixer software project plan and Project Operating
System through the lens of a white-glove, high-touch service. It identifies the
application and operating-design improvements required to provide personal
continuity, proactive support, discretion, low client effort, and reliable
follow-through.

## Overall Finding

The existing plans are strong on safety, privacy, accountability, and preventing
dropped tasks. They are weaker on the lived client experience: having one trusted
person, receiving proactive reassurance, avoiding repeated explanations,
experiencing warm handoffs, and feeling that the service anticipates needs.

The existing controls should remain. A high-touch service-experience layer should
be added around them.

White-glove service should mean:

> High discretion, low client effort, proactive communication, personal
> continuity, and reliable follow-through.

It should not mean unlimited availability, excessive information collection, or
unlimited work inside a fixed fee.

## Highest-Priority Improvements

### 1. Add a Named Relationship Owner and Backup

Every client should have:

- A primary navigator or relationship lead
- A named backup
- A clear introduction to both
- One person responsible for understanding the whole engagement
- A rule preventing the client from being passed between unfamiliar staff
- A visible record of who owes the next client contact

The primary navigator should remain accountable even when research, scheduling,
or administration is delegated.

Add relationship ownership to:

- The client record
- The action plan
- The controlled client journey
- The delegation map
- The daily exception report
- Continuity and absence testing

### 2. Define a Proactive Contact Cadence

Each service package should establish:

- Initial inquiry acknowledgement target
- Welcome or kickoff contact
- Frequency of proactive updates
- Maximum period without meaningful contact
- Business-hours response target
- Urgent-but-non-emergency escalation channel
- Appointment reminder and preparation timing
- Post-appointment follow-up
- What happens when there is no progress to report
- After-hours boundaries

A high-touch client should never have to wonder whether the business has
forgotten them.

No external progress should still produce a concise update. For example:

> I am still waiting for the provider's response. You do not need to take any
> action. I will follow up again Tuesday and update you by 3 p.m.

Contact standards must be package-specific. An Ongoing Concierge client should
receive a different cadence from a Clarity Session client.

### 3. Add a Client Preference and Service-Style Profile

The existing structured intake already captures preferred name, pronouns,
language, accessibility, communication method, and relevant cultural or personal
preferences. Where relevant to delivering the service, also consider recording:

- Preferred form of address and name pronunciation
- Best days and times for contact
- Preferred channel by purpose
- Desired level of detail
- Whether the client prefers choices or a recommended shortlist
- Whether reminders are welcome and how frequently
- Who should normally be present for decisions
- Topics or contacts requiring particular discretion
- Accessibility or cognitive-load accommodations
- Whether written summaries are needed after calls
- Important scheduling constraints
- Known sources of overwhelm relevant to service delivery

Do not collect personality trivia merely to appear personalized. Preference
information should reduce client effort or materially improve service.

### 4. Convert Action Tracking Into Promise Tracking

The current action-plan structure is operationally strong. It should be extended
with a distinct client-promise record containing:

- What was promised
- Who made the promise
- To whom it was made
- The promised date or contact time
- Whether the client is waiting
- Whether the promise was kept
- If delayed, whether the client was told before the deadline
- The recovery action when a promise was missed

A task can be internally complete while the client is still uncertain.
White-glove quality should therefore be measured at the client-facing promise
level, not only through internal task completion.

### 5. Establish a Warm-Handoff Standard

Every client-facing handoff should require the worker to:

1. Explain why another person is becoming involved.
2. Obtain any required client permission.
3. Introduce the new person directly.
4. Transfer context so the client does not repeat their story.
5. State what the new person will do and by when.
6. Confirm that the new person accepted responsibility.
7. Keep the primary relationship owner visible.
8. Follow up afterward to confirm the transition worked.

A handoff should not consist of giving the client another telephone number and
asking them to start again.

### 6. Add a Service-Recovery Process

The existing system handles formal complaints, incidents, privacy events, and
corrective actions. White-glove service also needs recovery for lower-level
experience failures, including:

- A missed callback
- A confusing message
- A provider cancellation
- An unexpected delay
- A repeated request for information
- A billing surprise
- A poor handoff
- A client feeling unheard
- A detail being technically completed but practically unhelpful

The recovery standard should include:

- Prompt acknowledgement
- One person taking ownership
- A plain-language explanation
- An immediate recovery plan
- A revised commitment
- Authority for an appropriate credit or goodwill action
- Follow-up to confirm the matter feels resolved to the client
- Internal learning that does not require the client to manage the correction

Not every service failure needs to become a formal incident, but every meaningful
failure should be visible and resolved.

### 7. Make Logistics Genuinely Door-to-Door

The appointment and logistics workflow should ask:

- Does the client know exactly where to go?
- Are parking, transit, mobility, and building-entry details confirmed?
- Are required forms or records ready?
- Does the client know what to bring?
- Are transportation and companion arrangements confirmed?
- Is there a backup if the appointment or transportation is cancelled?
- Does the client want a question list?
- Does the client want follow-up afterward?
- Are subsequent actions already anticipated?

This is one of the strongest opportunities to distinguish Fixer from a basic
referral directory.

### 8. Add White-Glove Measures to the Scorecard

Retain the existing safety, privacy, financial, and operational measures. Add:

- Inquiries acknowledged within the promised window
- Client-facing promises kept
- Delays communicated before the deadline
- Percentage of clients with one consistent relationship lead
- Warm handoffs completed successfully
- Client communication-preference adherence
- Average period without meaningful client contact
- Client effort: “How easy was it to get this handled?”
- Client confidence: “Did you know what would happen next?”
- Repeated requests for the same information
- Service-recovery frequency and satisfaction
- Proactive issues caught before becoming client problems
- Clients who would trust the service with another family member

These measures describe white-glove service more directly than general
satisfaction alone.

## Software Project Plan Changes

### Add a New Project Principle: High-Touch, Low-Friction Service

Add the following after the existing project principles:

> The client should experience one trusted relationship, proactive
> communication, minimal repetition, thoughtful preparation, and clear next
> steps. Operational complexity should remain behind the scenes. The system
> should help staff remember preferences and promises without encouraging
> unnecessary collection of personal information.

### Add Required Software Capabilities

The software requirements should include:

- Primary relationship owner and backup
- Last meaningful client contact
- Next promised client contact
- Package-specific contact cadence
- Client-facing promise register
- Communication preference profile
- Warm-handoff record
- Service-recovery record
- Contact-gap alerts
- Appointment-preparation and post-appointment checklists
- Client-effort and confidence feedback

### Expand Vendor-Selection Questions

Ask the following of every candidate product:

- Can the system show the entire relationship history without searching multiple
  tools?
- Can it alert staff before a promised client contact is missed?
- Can it distinguish internal tasks from client-facing promises?
- Can it support a named primary and backup navigator?
- Can staff personalize communication without losing approved templates?
- Is the client experience accessible and simple on a phone?
- Will the system force clients to repeatedly authenticate, upload, or explain?
- Can the business assist a client who finds portal use difficult without
  weakening security?

## Project Operating System Changes

The generic project-management controls should remain internal. Clients should
not be made to feel like items in a task register.

### Add a White-Glove Service Standard

Add a Fixer-specific section before the controlled client journey defining:

- One primary relationship owner
- Proactive contact cadence
- No unexplained silence
- Minimal client repetition
- Warm handoffs
- Personalized but privacy-minimized service
- Preparation before every client interaction
- Door-to-door logistics thinking
- Recovery when expectations are missed
- A calm, clear, non-transactional communication style
- Boundaries that prevent high touch from becoming uncontrolled scope

### Expand the Client-Facing Definition of Done

For client-facing work, completion should require:

- The operational task is complete.
- The client has been informed appropriately.
- The client understands the outcome and next step.
- Any promised document or update has been delivered.
- The record reflects what happened.
- Any follow-up has an owner and date.

“Created” and “sent” do not mean “complete.”

## White-Glove Test Scenarios

Add the following to fictional-client and pilot testing:

- An anxious client who needs reassurance but not more information
- An adult child outside Kelowna coordinating for a parent
- Family members with different communication preferences
- A client who does not use portals comfortably
- A provider cancelling at the last minute
- The primary navigator becoming unexpectedly unavailable
- A client being handed between two staff members
- A week in which no external progress occurs
- A missed callback or deadline requiring recovery
- A client who receives too many updates
- A client who needs a written summary after every conversation
- A concierge client making repeated out-of-scope requests
- A client who feels surprised by an additional charge
- A client who does not respond to a required decision

Test both operational correctness and how the client would experience the
interaction.

## Protect the Economics

High-touch services are particularly vulnerable to invisible scope expansion. For
every package, define:

- Included proactive contacts
- Response window
- Communication channels
- Number of authorized family recipients
- Appointment-attendance limits
- Travel radius
- Included research and coordination hours
- After-hours limits
- Additional-work approval
- Overage pricing

White-glove service should mean that the client performs less coordination—not
that the company performs unlimited work for a fixed price.

## Document-Control Improvement

There are currently identical copies of `fixer-software-project-plan.md` inside
and outside the Fixer repository. This creates a future source-of-truth risk.

The canonical copy should be:

`Fixer/Documents/fixer-software-project-plan.md`

The external copy should eventually become a clearly marked reference copy or be
replaced by a pointer to the canonical document.

## Conclusion

The operational foundation is strong. The required shift is from a reliable
coordination system to a reliable relationship system: one person knows the
client, the business anticipates the next concern, promises are visible, silence
is avoided, and any breakdown is owned and repaired gracefully.
