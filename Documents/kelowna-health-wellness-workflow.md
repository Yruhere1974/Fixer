# Kelowna Health & Wellness Navigator — Work Process Flow

```mermaid
flowchart TD
    A[Client inquiry or referral] --> B[Free 15-minute fit call]
    B --> C{Is the request within the<br/>navigator's non-clinical scope?}

    C -- No --> D[Explain limits and direct client<br/>to an appropriate service]
    D --> Z[Close inquiry and document outcome]

    C -- Yes --> E{Is there an immediate safety<br/>or medical concern?}
    E -- Yes --> F[Pause normal intake and direct to<br/>9-1-1, 9-8-8, 8-1-1, or a clinician]
    F --> G[Document objective facts<br/>and actions taken]
    G --> Z

    E -- No --> H[Recommend service package<br/>and confirm fees and response times]
    H --> I{Client wishes to proceed?}
    I -- No --> Z
    I -- Yes --> J[Sign service agreement, privacy notice,<br/>consent, and communication permissions]

    J --> K[Complete structured intake]
    K --> L[Define desired outcome, priorities,<br/>budget, deadlines, and accessibility needs]
    L --> M[Identify approved contacts and<br/>information-sharing boundaries]
    M --> N[Research options and verify credentials<br/>where regulated services are involved]

    N --> O[Prepare written action plan]
    O --> P[Review options, costs, risks,<br/>and responsibilities with client]
    P --> Q{Client approves the plan?}
    Q -- Changes needed --> O
    Q -- Yes --> R[Coordinate approved services,<br/>appointments, and logistics]

    R --> S[Prepare questions, reminders,<br/>documents, and appointment support]
    S --> T[Track actions, dates, costs,<br/>decisions, and outstanding items]
    T --> U[Send agreed progress update<br/>to client and approved contacts]
    U --> V{Is the client's agreed<br/>outcome complete?}

    V -- No --> W{Is a barrier or new need<br/>preventing progress?}
    W -- Yes --> X[Discuss options and obtain approval<br/>before changing scope or cost]
    X --> O
    W -- No --> R

    V -- Yes --> Y[Provide final summary, provider list,<br/>next steps, and maintenance guidance]
    Y --> AA[Confirm record retention or secure<br/>destruction according to policy]
    AA --> AB[Request feedback and offer ongoing<br/>support only if useful]
    AB --> AC[Close engagement]
```

## Staff operating checklist

| Stage | Required output | Control point |
|---|---|---|
| Inquiry | Inquiry record and source | Collect minimal personal information |
| Fit screening | Scope decision | Do not provide clinical advice |
| Safety screening | Referral or normal intake decision | Emergencies bypass the sales process |
| Onboarding | Signed agreement and consent | No work or information sharing before authorization |
| Intake | Confirmed goals, constraints, and contacts | Client remains the decision-maker |
| Research | Shortlist with verification dates | Disclose conflicts and avoid pay-to-play referrals |
| Planning | Written action plan | Client approves scope and third-party costs |
| Coordination | Booking and logistics record | Share only the minimum necessary information |
| Follow-up | Progress report and updated action list | Obtain approval for material changes |
| Closeout | Final summary and records decision | Follow privacy and retention policies |

## Client-facing summary

**Connect → Confirm fit → Give consent → Clarify needs → Build a plan → Coordinate services → Follow up → Close or continue**

> The navigator provides non-clinical research, organization, advocacy support, and practical coordination. Medical assessment, diagnosis, and treatment remain with appropriately qualified health professionals.
