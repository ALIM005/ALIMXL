> CURRENT READER NOTE — Documentation revision 1.2, 2026-11-23 (UTC+06:00).
> Read the final “Revision 1.2” section first for current overrides. Earlier sections
> are historical: the old 14-warning and unknown-recovery-cause statements are not
> the current conclusion. No new software release or automated run is claimed.

ALIMXL 4.0.0 — Manual & Practical Test Ledger
Ledger revision: 1.1 (documentation review; NOT a new software release)
Last reviewed: 2026-11-20 21:32 UTC+06:00
Execution evidence cutoff: user report 2026-11-20 21:22; latest execution screenshot approximately21:09
Application version: ALIMXL4.0.0, stated in earlier conversation
Environment: browser localhost:3000,Windows UI visible
Code revision / build hash: NOT RECORDED
Release verdict: NOT ESTABLISHED
Purpose: permanent AI handoff, manual/practical regression evidence and unresolved work.

1. ভবিষ্যৎ AI-এর জন্য বাধ্যতামূলক নির্দেশনা
Do not restart completed basic selection,ordinary lookup,banking,results or Save/Restore without concrete new risk/code change. User has spent days testing.

Save/Restore: user says completed five days earlier. Respect that; do not invent exact coverage.

Only ten Payroll records observed correct. Full150 independent audit NOT completed.

Distinguish screenshot/user confirmation/earlier summary/prepared/not executed. No upgrade of evidence by inference.

Negative-test FAIL/CHECK/BLOCKED can mean successful detection. Prepared formulas or Python expected values are NOT app execution.

Limited25 earlier VLOOKUP unit tests do not prove current full build,all functions,or release readiness.

Prefer minimal reviewed patches with backup/diff. Latest source must be supplied/verified before a current-code audit. No whole page.tsx replacement without need.

User prefers copyable on-screen input. Never place illustrative cell-position prose in a copyable data block. Earlier user pasted such prose due to ambiguous guidance.

Wrong sheet/range/selection is not automatically an application bug. Isolate reproduction.

This file does not embed screenshots; preserve actual evidence separately. Chat IDs are not durable filesystem evidence paths.

Some pre-summary history is unavailable. This is all identifiable coverage in the supplied summary/visible continuation, NOT proof that every historical test has been recovered.

No new ALIMXL test was executed during revision1.1; new entries make previously described observations explicit.

2. Status definitions
Status	Meaning
PASS_OBSERVED	Relevant actual outputs directly visible, limited to stated assertions.
PASS_USER	User confirmed success; separate screenshots for every assertion unavailable.
PASS_RECORDED	Earlier summary records pass; raw evidence not retained here.
COMPLETED_USER_REPORTED	Completed per user, precise criteria/logs unavailable.
RECORDED / PARTIAL	Activity occurred, acceptance coverage incomplete.
PREPARED	Fixture/formulas/expected data created, not full app execution.
UNVERIFIED / NOT_VERIFIED	Final evidence absent.
NOT_EXECUTED	Intended scenario, not run/confirmed.
BLOCKED_SETUP	Invalid/incomplete run because sheet/range/input setup wrong.
INCONCLUSIVE	Observation exists, cause not isolated.
ISSUE_USER_REPORTED / ISSUE_OBSERVED	Open concern, not diagnosed root cause.
3. Scenario register
GEN-01 — Basic selection/paste
Status: PARTIAL

Evidence, result and limitation: Earlier summary: exercised; detailed ranges and acceptance unavailable.

GEN-02 — SEQUENCE spill
Status: PASS_RECORDED

Evidence, result and limitation: =SEQUENCE(3) displayed1,2,3 in J1:J3. Collision/resize not proven.

GEN-03 — Manual workbook / JSON backup created
Status: RECORDED

Evidence, result and limitation: ALIMXL-Manual-Test-01 and JSON backup created. Creation does not prove restore.

GEN-04 — Save/Restore
Status: COMPLETED_USER_REPORTED

Evidence, result and limitation: At20:21 user said already tested five days earlier. Exact criteria and logs unavailable; do not repeat by default.

SALE-01 — Sales/Report baseline
Status: PASS_RECORDED

Evidence, result and limitation: Earlier summary:16 sales rows, cross-sheet SUM/SUMIF,reconciliation,14 initial PASS checks. Full individual check definitions unavailable.

SALE-02 — Sales source mutation
Status: PASS_RECORDED

Evidence, result and limitation: Sales!D2 10->100; report B2=261,B4=21587 expected. Other values not retained.

SALE-03 — Sales Undo
Status: PASS_RECORDED

Evidence, result and limitation: Undo returned report to prior values and all PASS; scope is that edit, not all history operations.

SALE-04 — Sales row insertion
Status: UNVERIFIED

Evidence, result and limitation: Earlier insertion attempt/plan recorded; final output absent. Not PASS.

LOOK-01 — Targeted VLOOKUP unit tests
Status: PASS_RECORDED

Evidence, result and limitation: Earlier assistant-reported25 limited tests passed. No current commit hash/raw logs/full regression proof.

LOOK-02 — Browser normal / absolute VLOOKUP
Status: PASS_RECORDED

Evidence, result and limitation: Both returned Rahim in earlier summary; only stated examples.

LOOK-03 — Lookup source propagation
Status: PASS_RECORDED

Evidence, result and limitation: Staff!B2 Rahim->Rahim SOURCE reached WorkLog!H2,B8,B9.

LOOK-04 — Local / cross-sheet isolation
Status: PASS_USER

Evidence, result and limitation: Earlier user A for success confirmation; exact formula matrix not retained.

BUILD-01 — Complete TypeScript / production build
Status: NOT_VERIFIED

Evidence, result and limitation: No completed full check/build evidence; no release-readiness verdict.

BANK-01 — Bank baseline
Status: PASS_OBSERVED

Evidence, result and limitation: BankAudit screenshot: CASH105500,BANK62800,total168300,10 matched,zero balance differences,overallPASS. Five sheets:Accounts/Ledger/Statement/Reconcile/BankAudit.

BANK-02 — Offsetting bank errors
Status: PASS_OBSERVED

Evidence, result and limitation: Statement!C2 8000->8100,C5 12000->11900; BANK62800,difference0,matched8,overallFAIL. Negative test succeeded.

BANK-03 — Mismatch detail / recovery
Status: PASS_USER

Evidence, result and limitation: User17:07 successful after combined instructions: BANK|T001 +100,BANK|R002 -100; restore matched10/overallPASS. Detailed screenshot not retained.

BANK-04 — Fill reconciliation formulas down
Status: PASS_OBSERVED

Evidence, result and limitation: NEW explicit subscenario: initial only row2 gave matched1; filling A2:G2 through row11 led to10 MATCH. Earlier summary + baseline screenshot. Evidence overlaps BANK-01; not general multi-column fill certification.

RES-01 — Ten-student baseline
Status: PASS_OBSERVED

Evidence, result and limitation: Screenshot20:10: all displayed totals/averages/statuses/grades/ranks match custom fixture;7PASS,2FAIL,1ABSENT.

RES-02 — High total but subject failure
Status: PASS_OBSERVED

Evidence, result and limitation: Ayesha100,100,100,100,32=>432,86.4,failed1,FAIL,F,no rank.

RES-03 — Exact pass boundary
Status: PASS_OBSERVED

Evidence, result and limitation: Salma five33s=>165,33,PASS,D,rank7.

RES-04 — Absence
Status: PASS_OBSERVED

Evidence, result and limitation: Hasan70,65,AB,80,75=>absent1;ABSENT total/result/grade;blank average;no rank. AB survives lookup.

RES-05 — Tied rank / exclusion
Status: PASS_OBSERVED

Evidence, result and limitation: Rahim/Karim/Rafi400 rank1;Mitu395 rank4;FAIL/ABSENT excluded. Competition ranking.

RES-06 — Source mutation / rerank
Status: PASS_OBSERVED

Evidence, result and limitation: Screenshot20:14: Marks!G4 32->33;Ayesha433,86.6,failed0,PASS,A+,rank1;Rahim/Karim/Rafi2,Mitu5,Tania6,Imran7,Salma8. No-refresh was requested but screenshot cannot establish no refresh occurred.

RES-07 — Result recovery
Status: PASS_USER

Evidence, result and limitation: User20:20 all correct confirmation after restoreG4=32 and auditD2:D16 allPASS request. No final audit screenshot.

RES-08 — Mark101 blocks publication
Status: PASS_USER

Evidence, result and limitation: User20:20 all correct confirmation after Marks!E9 79->101 request;expected L9CHECK,H9/M9/N9BLOCKED,O9dash;Tania4,Imran5,Salma6. No separate screenshot. Final restoration79 not visually proven.

RES-09 — Other input validation edges
Status: NOT_EXECUTED

Evidence, result and limitation: Blank,unknown text,negative and duplicate IDs intended; not individually run. >100 case belongs RES-08, not an unexecuted case.

UI-01 — Range selection / horizontal fill
Status: INCONCLUSIVE

Evidence, result and limitation: Repeated screenshots: only B then C filled; horizontal fill replaced original formulas and caused#N/A. Interaction/app cause not isolated.

UI-02 — Undo erroneous horizontal fill
Status: PASS_OBSERVED

Evidence, result and limitation: Screenshots20:04->20:06 restored five80s,total400,average80,PASS,A+,rank1.

UI-03 — Results TSV paste
Status: PASS_OBSERVED

Evidence, result and limitation: C3:O11 direct paste filled9rows*13columns with expected outputs screenshot20:10; not all clipboard types.

UI-04 — Sheet rename — displayed identity
Status: PASS_OBSERVED

Evidence, result and limitation: NEW: screenshots20:57->21:03 show Payroll renamed PayrollTemp and prior PayrollAudit renamed Payroll, with respective contents retained visibly. No proof of reference rewriting, collisions,undo or third planned rename; PayrollTemp remains.

UI-05 — Payroll multi-row formula paste
Status: PASS_OBSERVED

Evidence, result and limitation: NEW explicit interaction subscenario: header+10records*20columns visible correctly in sheet later namedPayroll. Original destination wasPayrollAudit; wrong destination does not negate the observed paste/calculation. Overlaps PAY-02; no independent150-row paste proof.

PAY-01 — 150-worker fixture
Status: PREPARED

Evidence, result and limitation: 150Employees,150Attendance,180Adjustments,5departments,shuffled sources,repeated names/distinct IDs. Full source ranges not independently verified after paste.

PAY-02 — First ten Payroll records
Status: PASS_OBSERVED

Evidence, result and limitation: Screenshots through21:09: E001-E010 lookup/input/calculated values match; earlier screenshot all10OK/READY. Not150records.

PAY-03 — Multiple adjustment aggregation
Status: PASS_OBSERVED

Evidence, result and limitation: E005bonus125+1125=1250;E010900+125=1025,visible. Sample only,not all180records audited.

PAY-04 — E011-E020 setup
Status: BLOCKED_SETUP

Evidence, result and limitation: Wrong sheet/A1 instead ofPayroll!A12; later illustrative text pastedA12:A16. No valid first20 result; no confirmed engine defect.

PAY-05 — Full150 independent audit
Status: NOT_EXECUTED

Evidence, result and limitation: Prepared expected grand total3991346.39;150individual checks required. Not reached.

PAY-06 — Offsetting same-department salaries
Status: NOT_EXECUTED

Evidence, result and limitation: Employees!E70 1675->1775;E12 2550->2450;grand/Admin unchanged,two individualFAIL. Must establish baseline first.

PAY-07 — Duplicate/missing Employee ID
Status: NOT_EXECUTED

Evidence, result and limitation: Employees!A59 E002->E001;both employeesCHECK/BLOCKED expected. Not run.

PAY-08 — Impossible attendance
Status: NOT_EXECUTED

Evidence, result and limitation: Attendance!C111 23->27 versus26days;E003BLOCKED expected. Not run.

PAY-09 — Half-cent OT rounding mutation
Status: NOT_EXECUTED

Evidence, result and limitation: Employees!F70 92.5->92.55;OT138.83/net19848.64 expected. Not run. Ordinary baseline decimal rounding was visible.

PAY-10 — Negative net HOLD
Status: NOT_EXECUTED

Evidence, result and limitation: Formula branch designed;no actual negative-net run.

PERF-01 — Large session slow
Status: ISSUE_USER_REPORTED

Evidence, result and limitation: User21:22 reported sheet/session large and slow. No timings/profile/cause; do not attribute to150 Payroll records since those were not completed.

PERSIST-01 — Recovery warning
Status: ISSUE_OBSERVED

Evidence, result and limitation: Repeated UI Recovery: সেভ হয়নি — সমস্যা আছে. Cause/impact unresolved; does not automatically invalidate earlier reported Save/Restore completion.

4. Counts and overlap
Total register entries: 43 (previous40 +3explicit observational subscenarios). No new product tests executed. BANK-04 overlaps BANK-01;UI-05 overlaps PAY-02. Entries are not mutually independent atomic tests. Earlier14Sales assertions and25unit tests are nested evidence. No product pass percentage should be calculated from these counts.

Status	Entries
BLOCKED_SETUP	1
COMPLETED_USER_REPORTED	1
INCONCLUSIVE	1
ISSUE_OBSERVED	1
ISSUE_USER_REPORTED	1
NOT_EXECUTED	7
NOT_VERIFIED	1
PARTIAL	1
PASS_OBSERVED	15
PASS_RECORDED	7
PASS_USER	4
PREPARED	1
RECORDED	1
UNVERIFIED	1
5. Bank baseline detailed assertions
Observed BankAudit baseline checks: Ledger CASH105500;Ledger BANK62800;Statement CASH105500;Statement BANK62800;CASH balance difference0;BANK difference0;totalLedger168300;Ledger transaction count10;Statement count10;matchedLedger10;Statement-only0;unknownLedger account0;unknownStatement account0;T001transferOK;T002transferOK;overallPASS. These are fixture assertions nested within BANK-01, not independent feature certification. No injected unknown account,Statement-only,duplicate-bank-key or broken-transfer case was executed in this record.

For BANK-02, edited Statement!C2 R002/BANK8000->8100 and C5 T001/BANK12000->11900. Net cancellation is deliberate. Reconcile expected BANK|T001 difference+100 and BANK|R002 difference-100;details/recovery user-confirmed,Audit matched8/overallFAIL screenshot-observed.

6. Exact Results fixture and policy
Custom policy,NOT official board rules:5subjects100each,each>=33required;AB=>ABSENT;one failed subject overrides high average;rank PASS students by total with ties1,1,1,4. Average thresholds80A+,70A,60A-,50B,40C,33D;FAIL=>F;invalid=>BLOCKED.

Sheets:Marks,Results,ResultAudit. Results columns:A ID;BName;C:Gsubjects;HTotal;IAverage;Jfailed;Kabsent;Lvalidation;Mresult;Ngrade;Orank.

ID	Name	Bangla	English	Math	Science	ICT	Total	Average	Result	Grade	Rank
S001	Rahim	80	80	80	80	80	400	80	PASS	A+	1
S002	Karim	90	80	70	80	80	400	80	PASS	A+	1
S003	Ayesha	100	100	100	100	32	432	86.4	FAIL	F	-
S004	Salma	33	33	33	33	33	165	33	PASS	D	7
S005	Hasan	70	65	AB	80	75	ABSENT	blank	ABSENT	ABSENT	-
S006	Nadia	70	60	50	40	30	250	50	FAIL	F	-
S007	Rafi	100	90	80	70	60	400	80	PASS	A+	1
S008	Mitu	79	79	79	79	79	395	79	PASS	A	4
S009	Imran	40	40	40	40	40	200	40	PASS	C	6
S010	Tania	60	60	60	60	60	300	60	PASS	A-	5
Baseline:10valid,7PASS,2FAIL,1ABSENT,0BLOCKED,3joint first;AuditD2:D16allPASS expected and later user-confirmed recovery. No retained direct final Audit allPASS screenshot.

Extra observed assertions already contained in RES-01:grade79=>A,60=>A-,40=>C;average50 with failed subject stillF;all ten validationOK;blank absent average;dash rank for excluded students. These do not prove every grade threshold:50/B,70/A transition,decimal boundaries and numeric-vs-text inputs remain untested individually.

Static baseline expected Audit values must NOT be edited to make mutations pass. Undo/recovery should restore baseline. Marks!G4=32 and Marks!E9=79 are baseline;final state after user's all-correct statement not separately screenshot-proven.

7. Payroll reproducible fixture (prepared, not full150 execution)
Fictional rules,NOT legal tax/payroll compliance. For i=1..150:

text
ID = E + three-digit i
Name = Worker + three-digit (((i-1) mod75)+1)
Department = [Admin,Sales,Factory,IT,Support][(i-1) mod5]
Basic = 18000 + (i mod23) * 725
Allowance = 1500 + (i mod7) * 175
OT rate = 85 + (i mod9) * 7.5
Workdays = 26
Paid leave = i mod3
Absent = i mod5
Present = 26 - Paid leave - Absent
OT hours = (i mod11) * 1.5
Primary Bonus = (i mod6) * 225
Primary Advance = (i mod8) * 150
Primary Fine = (i mod4) * 45
Every fifth i: append extra adjustment (ID,125,0,0)
150Employees,150Attendance,180Adjustments. Reproduction: Python random.Random(4000),construct all lists in ascending i,extra adjustment immediately after primary,shuffleEmployees thenAttendance thenAdjustments using same RNG sequentially. Payroll ascending ID. Same names distinct IDs (E001/E076) are prepared but a visually inspected same-name pair across full Payroll was NOT established.

text
Absent = Workdays - Present - Paid leave
Gross = ROUND(Basic + Allowance,2)
Absence deduction = ROUND(Basic / Workdays * Absent,2)
OT pay = ROUND(OT rate * OT hours,2)
Bonus/Advance/Fine = SUMIF over all matching adjustment rows
Net = ROUND(Gross - Absence deduction + OT pay + Bonus - Advance - Fine,2)
Independent expected values: Python Decimal ROUND_HALF_UP at corresponding steps,not app formula results.

Payroll A:T:A ID;BName;CDepartment;DBasic;EAllowance;FOT rate;GWorkdays;HPresent;IPaid leave;JOT hours;KAbsent;LGross;MAbsence deduction;NOT pay;OBonus;PAdvance;QFine;RNet;SValidation;TPayment status.

Validation:one ID match each Employees/Attendance/Payroll;COUNT(D:J)=7;MIN(D:J)>=0;Workdays>0;Present+Paid leave<=Workdays. Invalid=>CHECK/payBLOCKED. Valid negative net=>HOLD;otherwiseREADY. It does NOT comprehensively validate adjustment signs/types,orphan adjustments,integer day constraints,overtime caps or law. Fixed ranges Employees2:151,Attendance2:151,Adjustments2:181,Payroll2:151 do NOT cover new rows beyond their bounds.

Independent first-ten expected net (also observed displayed)
ID	Net
E001	19848.56
E002	20163.85
E003	20445.87
E004	20874.62
E005	25373.75
E006	24220.38
E007	23283.75
E008	24918.85
E009	24229.42
E010	29297.50
Other observed samples: E001gross20400,deduction720.19,OT138.75;E003deduction2327.88;E005absent0/deduction0;E010deduction0;E005bonus1250,E010bonus1025. Sample ROUND/SUMIF paths only,not arbitrary rounding/error semantics.

Full150 expected summary — NOT achieved app output
Metric	Expected
Individual PASS	150
Valid	150
READY	150
Grand net	3991346.39
Admin	828890.58
Sales	801303.28
Factory	759829.64
IT	735660.39
Support	865662.50
Prepared PayrollAudit:row1headers;rows2:151ID/independentExpected/Actual/Difference/Audit;row152blank;row153summaryHeaders;B154individualPASS;B155valid;B156READY;B157total;rows158:162department totals in above order;B163overall. Not validly populated/verified in app.

Prepared mutations,none executed
Test	Edit	Expected	Restore
Same-department cancellation	Employees!E70(E001)1675->1775 and E12(E006)2550->2450	E001net19948.56,E006net24120.38;grand/Admin unchanged;148individualPASS;overallFAIL	E70=1675,E12=2550
Duplicate/missing	Employees!A59 E002->E001	Both CHECK/BLOCKED,valid148	A59=E002
Impossible attendance	Attendance!C111(E003)23->27	Payroll!S4CHECK,R4/T4BLOCKED	C111=23
Half-cent rounding	Employees!F70(E001)92.5->92.55	Payroll!N2=138.83,R2=19848.64;grand3991346.47;149individualPASS	F70=92.5
Cell addresses assume original shuffle retained. Establish baseline first,one mutation at a time,restore baseline;do not alter independent expected Audit values.

8. Current workbook handoff — unresolved state,not instructions to paste
Latest screenshot about21:09;latest test-session report21:22:

Tabs Employees,Attendance,Adjustments,PayrollTemp,Payroll.

Payroll row1header;rows2:11E001..E010 correct.

PayrollTemp rows1:10E011..E020 but formulas reference rows12:21=>CHECK/BLOCKED. Not valid first20 evidence.

Prior PayrollAudit renamedPayroll;valid separate audit not present in last screenshot.

Payroll!A12:A16 contains illustrative text,not actual employee rows:row12 text Payroll!A11 = E010;row13 Payroll!A12 = E011;row14 Payroll!A13 = E012;row15 ellipsis;row16 Payroll!A21 = E020.

Assistant asked for oneUndo and actual TSV paste atPayroll!A12;NO later evidence cleanup occurred. Treat as potentially still contaminated.

No evidence E021-E150 pasted;do not assert first20/150 complete.

User stopped due to slowness;do not auto-dump remaining formula rows.

Do not copy/cut wrong-position formula cells and assume reference offsets preserved. Reinspect original formulas and intended destination before repair.

9. Coverage still missing — BACKLOG,not completed history
These are explicit evidence gaps,not a claim that the product is broken and not a request to repeat all tests now.

Area	Missing coverage / current boundary
Build	Full current TypeScript check,production build,source revision identification.
Payroll	150independent rows,department/grand audit,the four planned mutations,negativeHOLD;missing IDs in each source;duplicate Payroll IDs;missing/invalid adjustment data;orphan adjustment controls;full same-name-ID isolation.
Structure	Sales insertion final outcome;column insertion;deleting referenced rows/columns;sheet rename reference rewriting;sheet delete/undo;rename collision. Display rename UI-04 is not reference rewriting proof.
Sorting/filtering	Row integrity with sort/filter;lookup after source reorder beyond prepared shuffle;rank and totals under filtering. No retained execution evidence.
Formula edges	Circular references,division by zero,error propagation,IFERROR fallback semantics,unknown functions;dynamic spill collision/resize;invalid cross-sheet references.
Academic validation	Blank/text/negative/duplicate IDs;numeric text/coercion;all grade transition boundaries.101 scenario user-confirmed only.
Clipboard / history	Controlled multi-column selection/fill reproduction;relative/mixed/absolute reference translation on copy/cut;Redo,multi-step Undo,cross-sheet history. Two specific Undo paths passed,not all.
Performance	Measured paste/recalc/interaction times,formula/cell count,device/browser/profile. Distinguish conversation-page slowness from spreadsheet runtime.
Persistence warning	Diagnose displayed recovery warning. Earlier Save/Restore user completion respected;do not automatically rerun whole persistence suite.
Version traceability	Commit/build hash,evidence artifact filenames,raw limited-test logs unavailable.
10. Functions actually exercised — avoid blanket certification
Observed integrated outputs provide evidence of these paths within fixtures:

VLOOKUP:normal/absolute/cross-sheet examples and changed-source examples.

SUM/SUMIF:Sales summary,bank balances,and sampled multiple Payroll adjustments.

COUNTIF:bank matched count,Results subject/status counts;COUNTIFS:PASS-only competition ranking.

IF/AND/COUNT/MIN/MAX:valid Results/Payroll rows and user-confirmed101 validation path.

ISNUMBER:Results numeric total vsABSENT branch.

IFERROR:Payroll successful lookup path;missing-lookup fallback itself not independently isolated.

ROUND:sample baseline salary/deduction outputs;half-cent mutation NOT executed.

SEQUENCE:simple3-row spill from earlier summary only.

None of the above certifies every argument mode,error case,data type or function implementation. Visible static expected data are not proof of a function being called unless corresponding formula evidence/workflow exists.

11. Open issues and next-work discipline
Source state/performance:inspect CURRENT app/page.tsx and relevant evaluator/store modules only if user requests code review;do not assume old uploaded source current.

Profile before guessing slowdown root cause. User wording may refer to sheet or long conversation;timings/cell counts absent.

Recovery warning remains unresolved;successful earlier Save/Restore report does not diagnose its cause.

Distinguish incomplete setup from confirmed bugs. #N/A after horizontal fill came with wrong lookup reference;no demonstrated recurrence of old VLOOKUP defect.

IFERROR can hide missing setup as blank;inspect source IDs and destination before engine diagnosis.

Preserve ledger in main project;assistant generated file but did not commit/write into user's actual repository.

Suggested placement docs/testing/ALIMXL_4.0.0_MANUAL_PRACTICAL_TEST_LEDGER.md;README should point AI to it. Not proof of actual save.

Preserve original entries/evidence classifications after code changes. Future targeted regressions must record new revision.

12. Append-only test template
Test ID/date/current source revision:

Hypothesis/risk and why retest needed:

Exact preconditions/source/destination cells:

Exact mutation/formula (distinguish input from explanation):

Independently calculated expected result:

Actual result:

Real evidence artifact filename / committed project-relative location:

Status and scope:

Restore/Undo verification:

Timings if measured:

Limitations/next action:

13. Revision1.1 changelog and review boundary
Retained all40original scenario IDs;addedBANK-04,UI-04,UI-05(43entries total),all describing already recorded observations,not fresh tests.

Expanded bank baseline subassertions,Results grade/status subassertions,Payroll zero-deduction/rounding samples without inflating them into independent successes.

Added function-level evidence boundary and explicit unexecuted backlog.

Corrected pasted-format ambiguity:Bonus=(i mod6)225;Advance=(i mod8)150. Multiplication signs are literal inside code block.

Corrected RES-09 to exclude >100 from unexecuted claims because RES-08already user-confirmed that case.

Clarified rename display vs formula reference rewriting and partial two-step rename vs planned third step.

No new code audit/build/app execution. No unseen historical screenshots inspected;old unavailable history remains unknown.

Review sources: supplied conversation summary,user-pasted v1.0ledger,visible prior conversation/screenshots. Original screenshot filenames/commit paths not invented.

14. বাংলা সারসংক্ষেপ
ব্যাংকিং ও দশ-শিক্ষার্থীর নির্দিষ্ট baseline/mutation সফল;কিছু recovery/validation ব্যবহারকারীর নিশ্চিতকরণে পাস।আগেরSales/VLOOKUPপাস summary-নির্ভর।Save/Restoreআগেই হয়েছে বলে ব্যবহারকারী জানিয়েছেন।Payrollপ্রথমদশজনই দৃশ্যমানভাবে সঠিক;১৫০জনেরauditহয়নি।Rename-এরদৃশ্যমানদুইধাপ,bankfillএবংPayrollpasteএবারআলাদানথিভুক্ত,কিন্তুনতুনপরীক্ষানয়।Setupপেস্টভুল,selection/fillবিভ্রান্তি,recoverywarningএবংslowdownকারণনির্ণীতapplicationbugহিসেবেদেখাবেননা।সবfeatureবাproductionreadinessপাসবলেননি।

============================================================
ALIMXL 4.0.0 — অতিরিক্ত কাজ ও পরীক্ষার হ্যান্ডঅফ নোট
রিপোর্টের তারিখ: ২০২৬-১১-২১
আলোচনার সময়সীমা: রাত ১:১১ পর্যন্ত, UTC+06:00
ধরন: পুরোনো তদন্ত রিপোর্টের সংযোজন; নতুন software release নয়।
============================================================

১. এই নোটের উদ্দেশ্য
------------------------------------------------------------
নতুন XLSX কাজ, automated verification এবং বাস্তবে করা manual
পরীক্ষাগুলোর অগ্রগতি নথিভুক্ত করা, যাতে পরবর্তী AI বুঝতে পারে
কোন অংশ সম্পন্ন এবং কোন অংশ এখনও বাকি।

প্রমাণের ধরন:
- Terminal log: ব্যবহারকারীর চালানো command-এর দেওয়া output।
- Screenshot: ব্রাউজারে দৃশ্যমান ফল।
- User confirmation: ব্যবহারকারীর সরাসরি নিশ্চিতকরণ।
- Prepared: নমুনা বা নির্দেশনা তৈরি হয়েছে, পরীক্ষা সম্পন্ন নয়।

Assistant নিজে ব্যবহারকারীর repository-তে command চালায়নি।
Exact commit/build hash নথিভুক্ত হয়নি।


২. নতুন XLSX ইম্পোর্ট/এক্সপোর্ট কাজ
অবস্থা: CHANGE REPORTED + সংশ্লিষ্ট পরীক্ষার ফল পাওয়া গেছে।
------------------------------------------------------------
আলোচনায় ExcelJS-ভিত্তিক XLSX import/export যুক্ত করার কাজ
করা হয়েছে।

সংশ্লিষ্ট ফাইল:
- lib/xlsx-format-io.mjs
- tests/xlsx-round-trip.test.mjs

পরবর্তী প্রমাণ:
- নির্দিষ্ট XLSX automated test পাস।
- পূর্ণ discovered Node test run পাস।
- TypeScript/build সফল।
- ব্রাউজারে colourful XLSX টাইমশিট খুলেছে।

সীমা:
সর্বশেষ edited source, dependency lockfile ও সম্পূর্ণ diff
পুনরায় audit করা হয়নি। সব Excel feature সমর্থিত বলা যাবে না।


৩. নির্দিষ্ট XLSX automated test
অবস্থা: PASS — ব্যবহারকারীর terminal log অনুযায়ী।
------------------------------------------------------------
Command:
node --test tests/xlsx-round-trip.test.mjs

ফল:
- Tests: 3
- Pass: 3
- Fail: 0
- Cancelled: 0
- Skipped: 0

পাস করা test:
1. XLSX export creates a valid Excel workbook blob.
2. XLSX round-trip preserves core formatting.
3. XLSX import rejects an invalid workbook.

সীমা:
শুধু test-এ বাস্তবে থাকা assertions পাস হয়েছে।
সব formatting, সব invalid file অথবা manual browser
export–reimport সম্পূর্ণ যাচাই হয়েছে—এমন নয়।


৪. পূর্ণ discovered Node test run
অবস্থা: PASS — ব্যবহারকারীর terminal log অনুযায়ী।
------------------------------------------------------------
Command:
node --test

ফল:
- Tests: 154
- Pass: 154
- Fail: 0
- Cancelled: 0
- Skipped: 0
- Todo: 0
- Reported duration: 3211.3424 ms

দেখানো test group-এর মধ্যে ছিল:
- Chart geometry ও chart data handling।
- Formula functions ও localisation।
- Cross-sheet references/dependencies।
- Recovery draft identity ও storage rules।
- Backup/workbook validation।
- XLSX round-trip।

গুরুত্বপূর্ণ:
উপরের ৩টি XLSX test এই ১৫৪টির মধ্যেই আছে।
১৫৭টি আলাদা test হিসেবে গণনা করবেন না।

সীমা:
এই পূর্ণ run পরবর্তী lint-related source পরিবর্তনের আগে হয়েছে।
সর্বশেষ lint পরিবর্তনের পরে আবার পূর্ণ test run-এর প্রমাণ নেই।
১৫৪টি test পাস মানে ১৫৪টি feature সম্পূর্ণ certified নয়।


৫. TypeScript check
অবস্থা: PASS — ব্যবহারকারীর terminal log অনুযায়ী।
------------------------------------------------------------
Command:
npm run typecheck

দেখানো run-এ:
tsc --noEmit কোনো প্রদর্শিত TypeScript diagnostic ছাড়া শেষ হয়েছে।

পরবর্তী latest production build-এর TypeScript stage-ও সফল।

সীমা:
Type checking সফল হওয়া runtime behaviour-এর পূর্ণ প্রমাণ নয়।
Exact source revision/hash নেই।


৬. Production build
অবস্থা: PASS — ব্যবহারকারীর terminal log অনুযায়ী।
------------------------------------------------------------
Command:
npm run build

একাধিক সফল run দেওয়া হয়েছে।

সর্বশেষ দেওয়া output-এ:
- Package: alimxl@4.0.0
- Next.js 16.4.5 / Turbopack
- Compiled successfully
- TypeScript stage finished
- Page-data collection successful
- Static page generation: 19/19
- Final page optimisation successful

সীমা:
Build সফল মানে সব manual feature, security, persistence বা
production readiness যাচাই হয়েছে—এমন নয়।


৭. Lint error সংশোধন
অবস্থা: সর্বশেষ run-এ ০ error; ১৪ warning অবশিষ্ট।
------------------------------------------------------------
Command:
npm run lint

অগ্রগতি:
- প্রথম run: 6 errors, 14 warnings।
- পরবর্তী run: 1 error, 14 warnings।
- সর্বশেষ run: 0 errors, 14 warnings।

আলোচনায় নির্দেশিত সংশোধন:
- app/page.tsx-এর পাঁচটি explicit any assertion
  পরিবর্তন/বাদ দেওয়া।
- setSpillRanges update queueMicrotask-এ নেওয়া।
- setSpillCalculationStatus update queueMicrotask-এ নেওয়া।

পরবর্তী ফল:
- Typecheck/build পাসের log পাওয়া গেছে।
- সর্বশেষ lint-এ error শূন্য।

অবশিষ্ট warning:
সবগুলো প্রদর্শিত warning:
@typescript-eslint/no-unused-vars

আরও একটি পৃথক Babel note:
app/page.tsx 500 KB-এর বেশি হওয়ায় code-generator styling
deoptimisation-এর বার্তা এসেছে।

সীমা:
- সর্বশেষ source/diff পুনরায় inspect করা হয়নি।
- Type assertion runtime validation নয়।
- queueMicrotask দিয়ে lint পাস হওয়া spill logic অপরিবর্তিত
  থাকার প্রমাণ নয়।
- Post-edit spill recalculation/collision/resize/disable
  behaviour আলাদাভাবে যাচাই হয়নি।
- ১৪টি warning-কে যাচাই ছাড়া “harmless” বলা যাবে না।


৮. রঙিন ১৫০ জনের Weekly Timesheet নমুনা
অবস্থা: PREPARED — ফাইল তৈরি হয়েছে।
------------------------------------------------------------
তৈরি ফাইল:
ALIMXL_Colorful_150_Employee_Timesheet.xlsx

Sheet:
Weekly Timesheet

নমুনার বিবরণ:
- 150 fictional employee records।
- 21–27 November 2026।
- Employee ID, নাম ও বিভাগ।
- সাত দিনের কাজের ঘণ্টা।
- Total Hours, OT Hours, Rate/Hour।
- Regular Pay, OT Pay, Total Pay।
- শেষে total row।

বিন্যাস:
- A:Q পর্যন্ত কলাম।
- 1:3 নম্বর সারিতে title/instructions।
- 4 নম্বর সারিতে header।
- 5:154 নম্বর সারিতে employee records।
- 155 নম্বর সারিতে totals।

প্রস্তুত formatting:
- রঙিন header।
- দৈনিক ঘণ্টায় নীল।
- শুক্রবারে গোলাপি।
- মোট/ওভারটাইম ঘণ্টায় বেগুনি।
- Rate-এ হলুদ।
- বেতনের কলামে সবুজ।
- Borders, merged title, column widths, row heights।
- Freeze-pane configuration।

নমুনা হিসাব:
- সপ্তাহে 48 ঘণ্টার বেশি হলে OT।
- OT rate: সাধারণ hourly rate-এর 1.5 গুণ।

এগুলো কাল্পনিক sample policy; আইনগত payroll compliance নয়।

বিশেষ সতর্কতা:
এটি আগের Employees/Attendance/Adjustments/Payroll fixture নয়।
দুটি পৃথক পরীক্ষার নমুনা।


৯. রঙিন XLSX import-এর manual পরীক্ষা
অবস্থা: PASS OBSERVED — শুধু দৃশ্যমান অংশের জন্য।
------------------------------------------------------------
ব্যবহারকারী তৈরি XLSX ফাইল ALIM XL-এ খুলেছেন এবং
স্ক্রিনশট দিয়েছেন।

দৃশ্যমান ফল:
- Weekly Timesheet sheet name এসেছে।
- Title ও instruction rows দেখা গেছে।
- ডেটা আলাদা আলাদা কলামে বসেছে।
- Teal header ও সাদা লেখা এসেছে।
- নীল, গোলাপি, বেগুনি, হলুদ ও সবুজ cell fills দেখা গেছে।
- Borders ও differentiated column widths দেখা গেছে।

প্রথম কর্মীর প্রদর্শিত হিসাব:
- Name: Alim Uddin
- Total Hours: 52
- OT Hours: 4
- Rate/Hour: 120
- Regular Pay: 5760
- OT Pay: 720
- Total Pay: 6480

সীমা:
- পুরো 150 জনের সব record audit হয়নি।
- শেষের total row audit হয়নি।
- এডিটের পর formula recalculation প্রমাণিত হয়নি।
- Scrolling করে freeze panes পরীক্ষা হয়নি।
- Exact RGB/width/height equality মাপা হয়নি।


১০. এক শিট থেকে অন্য শিটে রঙসহ কপি-পেস্ট
অবস্থা: PASS OBSERVED + USER CONFIRMED।
------------------------------------------------------------
এটি এই manual session-এর নিশ্চিত সফল কালার পরীক্ষা।

কাজ:
ব্যবহারকারী Weekly Timesheet-এর নির্বাচিত অংশ কপি করে
একই workbook-এর Sheet 2-এ পেস্ট করেছেন।

স্ক্রিনশটে:
- Header প্রথম সারিতে।
- 14 জন কর্মীর selected data পরের সারিগুলোতে।
- ডেটা আলাদা কলামে বসেছে।
- Header-এর teal background ও সাদা লেখা বজায় আছে।
- Daily hours-এর নীল fill বজায় আছে।
- Friday-এর গোলাপি fill বজায় আছে।
- Total/OT hours-এর বেগুনি fill বজায় আছে।
- Rate-এর হলুদ fill বজায় আছে।
- Payment-এর সবুজ fill বজায় আছে।
- দৃশ্যমান borders বজায় আছে।

ব্যবহারকারীর স্পষ্ট নিশ্চিতকরণ:
যতটুকু কপি করেছেন, ঠিক ততটুকু দ্বিতীয় শিটে পেস্ট করেছেন।
পরীক্ষার উদ্দেশ্য ছিল colour testing।
ব্যবহারকারীর মতে colour testing সফল।

গ্রহণযোগ্য সিদ্ধান্ত:
Selected-range, same-workbook, cross-sheet colour copy/paste:
PASS।

গুরুত্বপূর্ণ ব্যাখ্যা:
Sheet 2-এ title বা অবশিষ্ট employee rows না থাকা data loss নয়।
সেগুলো ব্যবহারকারী কপি করেননি।

এই নির্দিষ্ট সফল colour-copy test অকারণে আবার করাবেন না।

সীমা:
এটি XLSX export–reimport test নয়।
এটি cross-workbook/external clipboard test নয়।
Formula-reference translation, conditional formatting,
merged-cell copying বা সব paste mode-এর প্রমাণ নয়।


১১. প্রস্তাব করা হয়েছিল, কিন্তু সম্পন্ন হওয়ার প্রমাণ নেই
অবস্থা: NOT CONFIRMED EXECUTED।
------------------------------------------------------------
ক. Original Weekly Timesheet-এ E5-এর 8 বদলে 10 করা।

প্রত্যাশিত:
- L5 = 54
- M5 = 6
- O5 = 5760
- P5 = 1080
- Q5 = 6840

এই পরিবর্তনের confirmed result পাওয়া যায়নি।

খ. Sheet 2-এ প্রথম কর্মীর E2-এর 8 বদলে 10 করা।
এটিও প্রস্তাবিত ছিল; confirmed execution নেই।

গ. পরিবর্তিত workbook XLSX হিসেবে export করে আবার import।
Confirmed manual execution নেই।

ঘ. Export–reimport-এর পরে রঙ, borders ও formulas তুলনা।
Confirmed result নেই।

ঙ. পুরো 150 জনের হিসাব এবং final totals audit।
সম্পন্ন হয়নি।

চ. Freeze panes-এর scrolling behaviour পরীক্ষা।
সম্পন্ন হওয়ার প্রমাণ নেই।

এসবকে PASS বা completed লিখবেন না।


১২. এখনও দৃশ্যমান উদ্বেগ
------------------------------------------------------------
Recovery warning:
পরবর্তী timesheet screenshot-গুলোতেও দেখা গেছে:
“Recovery: সেভ হয়নি — সমস্যা আছে”

অবস্থা:
কারণ ও প্রভাব নির্ণীত নয়।

এটি আগের user-reported Save/Restore completion বাতিল করে না।
আবার build সফল হয়েছে বলে warning সমাধান হয়েছে—এমনও নয়।

Source traceability:
বর্তমান exact commit/build hash নেই।
Final edited source/diff পুনরায় পর্যালোচিত নয়।


১৩. পুরোনো Payroll পরীক্ষার সঙ্গে সম্পর্ক
------------------------------------------------------------
নতুন colourful Weekly Timesheet এবং পুরোনো 150-worker
Payroll audit আলাদা কাজ।

নতুন কাজ দিয়ে পুরোনো Payroll-এর:
- Full 150 independent audit।
- Department/grand reconciliation।
- Planned negative mutations।
- Historical setup cleanup।

এসব সম্পন্ন হয়েছে বলা যাবে না।

পুরোনো Payroll-এর যেসব অংশ incomplete ছিল, নতুন প্রমাণ
না পাওয়া পর্যন্ত সেগুলো আগের অবস্থাতেই থাকবে।


১৪. পরবর্তী AI-এর জন্য কাজের নিয়ম
------------------------------------------------------------
- সফল basic colour copy/paste test অকারণে পুনরাবৃত্তি নয়।
- User-selected partial range-কে missing-data bug বলবেন না।
- Screenshot, user confirmation, terminal log ও prepared
  expected result আলাদা রাখবেন।
- 3 XLSX test ও 154 full-run test double-count করবেন না।
- Latest edited source-কে post-edit full regression passed
  বলবেন না; নতুন full run নথিভুক্ত হয়নি।
- Code review দরকার হলে latest source/diff চাইবেন।
- পুরো page.tsx অকারণে replace করবেন না।
- আগের Payroll audit নতুন timesheet দিয়ে সম্পন্ন দেখাবেন না।
- আগের assistant-এর অতিরিক্ত নিশ্চিত বক্তব্য:
  “সব feature অক্ষত”, “কোনো runtime সমস্যা হবে না”,
  “production-ready”—এগুলো audit conclusion নয়।


১৫. বর্তমান সারসংক্ষেপ
------------------------------------------------------------
সম্পন্ন/প্রমাণিত:
1. নির্দিষ্ট XLSX automated test: 3/3 PASS।
2. পূর্ণ discovered Node test: 154/154 PASS,
   তবে পরবর্তী lint edits-এর আগের run।
3. TypeScript check: supplied logs-এ PASS।
4. Production build: supplied logs-এ PASS।
5. Latest lint: 0 errors, 14 warnings।
6. 150-person colourful timesheet fixture তৈরি।
7. Styled XLSX import: visible area PASS।
8. Selected-range cross-sheet colour copy/paste:
   screenshot + user confirmation অনুযায়ী PASS।

এখনও বাকি/অপ্রমাণিত:
1. Latest lint edits-এর পরে full Node test rerun।
2. Manual XLSX export–reimport comparison।
3. ঘণ্টা বদলে formula recalculation confirmation।
4. Full 150-person timesheet audit।
5. Recovery warning diagnosis।
6. Current source revision/hash ও final diff verification।

সামগ্রিক release verdict:
NOT ESTABLISHED।

এই নোট তৈরি মানে ব্যবহারকারীর repository-তে ফাইল save বা
commit হয়েছে—এমন নয়। ব্যবহারকারী পুরোনো রিপোর্টের নিচে
সংযোজন হিসেবে সংরক্ষণ করবেন।

===================== নোটের সমাপ্তি =====================

---
# Revision 1.2 — Consolidated handoff / বর্তমান অবস্থার সংযোজন

Documentation date: 2026-11-23, UTC+06:00; conversation cutoff approximately 00:16.
This is a documentation update, NOT a software release or newly executed app test.
This section supersedes older CURRENT-STATUS statements where explicitly noted below;
all older historical observations and their evidence levels are retained above.

## A. Primary record and research scope

Update THIS file for all future manual/practical results:
`docs/testing/ALIMXL_4.0.0_MANUAL_PRACTICAL_TEST_LEDGER.md`.
The uploaded ZIP already contains this file: do not create a second competing master ledger.
Review covered the complete ZIP member inventory, existing documentation/test-result files,
package scripts, recovery policy, and locations of the proposed rounding call.
It was NOT a line-by-line audit of all application code, fresh browser execution,
or a new TypeScript/lint/build/Node test run. ZIP source is an uploaded snapshot,
not necessarily the user's latest working source. Commit/build hash remains unavailable.

Archive result logs such as UPDATE-TEST-RESULTS.txt and update-docs/TEST-RESULTS.txt
are historical automated/packaging outputs. Preserve them; do not append manual
screenshots as if they were fresh automated test output.

## B. Current status overrides

### BUILD-01-UPDATE — Latest local command status
Status: PASS_USER / precise command outputs not independently re-inspected here.
User reports the commands had been run about two hours before the earlier discussion
and that there are now no warnings, skipped tests, or build errors.
This supersedes the old claim that 14 warnings are necessarily still current.
Do NOT invent a new test count, elapsed time, exact command list or current commit.
The historical 154/154 log remains historical and is not a new post-rounding regression run.
The rounding patch below has not been verified by a fresh full suite in this session.

### PERSIST-01-UPDATE — Recovery limit explained
Status: CONFIGURED_LIMIT_OBSERVED + DESIGN_CONFIRMED_USER.
Expanded screenshot explicitly displays:
“Recovery limit reached (30 drafts). Remove unneeded drafts from Recovery panel.”
User confirms the 30-draft cap was intentional to avoid unlimited browser accumulation.
ZIP source lib/recovery-policy.mjs declares MAX_RECOVERY_DRAFTS = 30.
canWriteRecovery permits an existing key to update even at the cap, but refuses a new
key when the cap is full. Thus a full store is not proof that every draft update fails.
Supersedes earlier undiagnosed-warning status for THIS observed warning only.
Generic main Save failure, data loss or a recovery-engine defect is NOT established.
User states no important data is present and elects to defer recovery cleanup/testing.
Delete-then-new-draft success has NOT been observed; do not label it tested PASS.
Performance benefit of this cap was not benchmarked.

## C. Additional manual/practical records

### BANK-05 — Opening/input balance mutation and dependent range
Status: PASS_RECORDED (earlier conversation screenshot assessment; original durable evidence path absent).
Mutation: I2 changed from 5000 to 6000 in the banking fixture.
Actual: each J2:J11 value increased by 1000; J12:J15 remained unchanged.
Scope: that dependency/recalculation scenario only. Account separation was implemented
by formulas, NOT automatic bank-account recognition by the application.
Exact formula text, sheet name and full source dataset are not retained here.

### ROUND-01 — Calculated decimal discrepancy before proposed change
Status: ISSUE_RECORDED; targeted reproduction later passes ROUND-02.
Observed direct formula =ROUND(53.865,2) -> 53.87.
Observed calculated formula =ROUND(3*19.95*(1-0.1),2) -> 53.86.
A cell-reference equivalent also displayed 53.86.
Observed rounded total: 1391.57; expected fixture total: 1391.58.
Root cause was not proven with runtime intermediate-value instrumentation.
Excel/LibreOffice execution of the same fixture was NOT independently verified.
Do not call this a proven universal compatibility failure or final engine-wide fix.

### ROUND-PATCH-01 — Minimal proposed edit and source divergence
Status: PATCH_PROPOSED + POST-CHANGE_OUTPUT_OBSERVED; exact latest saved diff unverified.
The supplied paste.txt was previously reviewed for roundHalfAway and cleanNumber.
Proposed replacement, after backing up the actual source file:
Before: const result = roundHalfAway(numeric, digits);
After:  const result = roundHalfAway(cleanNumber(numeric), digits);
cleanNumber was described in the earlier review as 15-significant-digit normalization.
Do not infer all near-boundary/high-precision cases are safe.
Important ZIP finding: BOTH app/page.tsx and lib/formula-core.mjs in the uploaded
snapshot still contain the uncleaned call. The new cleaned call is absent in these
locations. This is snapshot divergence, NOT proof the user's current local edit failed.
Record actual edited file/commit and verify browser versus core evaluator parity
before treating this as a repository-wide merged fix. No code was modified by this report.

### ROUND-02 — Eight-case screenshot regression
Status: PASS_OBSERVED for eight displayed Actual/Expected pairs.
Evidence: latest two rounding-sheet screenshots in this conversation; not embedded
or assigned invented durable filenames. Selected cell is blank D5, so formula-bar
contents do not independently establish every B-cell formula.
The sequence of the discussion links these outputs to the proposed regression set.

| Case | Displayed actual | Displayed expected | Formula evidence boundary |
|---|---:|---:|---|
| Direct | 53.87 | 53.87 | Proposed direct ROUND case |
| Calculated | 53.87 | 53.87 | Proposed calculated ROUND case |
| Negative calculated | -53.87 | -53.87 | Negative calculated input; exact stored formula not inspected |
| Below boundary | 53.86 | 53.86 | Exact input literal not retained |
| Above boundary | 53.87 | 53.87 | Exact input literal not retained |
| Basic positive half | 3 | 3 | Proposed ROUND(2.5,0) |
| Basic negative half | -3 | -3 | Proposed ROUND(-2.5,0) |
| Negative digits | 1300 | 1300 | Proposed ROUND(1250,-2) |

Eight matching pairs are nested assertions in this scenario, not eight independently
certified features. Positive calculated discrepancy no longer appears in this fixture.
No global ROUND certification, all-functions pass percentage or release verdict follows.

### ROUND-03 — Original product fixture end-to-end recheck
Status: NOT_CONFIRMED_EXECUTED.
Suggested recheck: original F2 = 53.87 and =ROUND(SUM(F2:F7),2) = 1391.58.
No final screenshot/user confirmation received. Do not mark the original total fixed yet.

### PAY-11 — Large monetary salary-sheet request deferred
Status: DEFERRED_USER; not an executed test.
User initially requested a 50-crore-taka salary sheet, then stopped that direction
and prioritised difficult formula tests. Neither dataset creation nor full salary
validation is established by this request. Keep old PAY-01 through PAY-10 boundaries.

## D. Current handoff / what not to repeat

- Prioritise difficult formula correctness and unsupported-function discovery.
- Do not keep treating the known 30-draft cap as an undiagnosed defect.
- Do not repeat completed colour-copy/basic examples without a concrete new risk.
- Preserve earlier ten-row Payroll successes; do not promote them to 150 audited rows.
- Keep Sales, banking reconciliation, Results and colourful Timesheet records above.
- Preserve user-reported Save/Restore completion without inventing exact coverage.
- No global numerical product score is a reproducible certification; earlier 70–75/100
  was an approximate assessment, not a formal benchmark.
- Latest build report, uploaded ZIP state, pasted source and browser session may differ.

## E. Historical automated evidence reconciliation

Uploaded update-docs/TEST-RESULTS.txt records 49 print tests and 151 other tests;
its mocked UI section explicitly says realBrowser:false. UPDATE-TEST-RESULTS.txt
records a separate 24-test chart run. The earlier ledger records a 154-test full run
including 3 XLSX tests. These are different historical runs/snapshots and overlapping
suites. NEVER sum 49 + 151 + 24 + 154 into a unique current test count.
A test title mentioning Excel/LibreOffice is not by itself fresh execution in either app.
No automated commands were rerun while preparing this documentation.

## F. Future append-only entry template

### TEST-ID — Short title
- Date/time/timezone:
- App version / commit / build identifier:
- Environment: browser/version, OS, device; if unrecorded say UNKNOWN.
- Evidence level: screenshot / user report / raw log / summary / prepared only.
- Preconditions: workbook/sheet, exact source and destination ranges:
- Exact inputs or formulas (copyable block, no explanatory prose mixed in):
- Mutation:
- Independently derived expected output:
- Actual output:
- Status: PASS_OBSERVED / PASS_USER / FAIL_OBSERVED / INCONCLUSIVE /
  BLOCKED_SETUP / PREPARED / NOT_EXECUTED / DEFERRED_USER.
- Evidence artifact: real project-relative filename; UNKNOWN if not saved.
- Restore/Undo result:
- Timing, only if measured:
- Scope/limitations and next action:

Store future real evidence under docs/testing/evidence/ using unique dated names.
That directory is a recommendation, not a claim that past screenshots were recovered.
Do not overwrite earlier failures with later passes: append the retest and link IDs.
Do not recalculate the old 43-entry table as a current feature pass percentage;
it is explicitly a historical register with nested and overlapping assertions.

## G. Revision 1.2 limits and completion

Retained the entire original ledger and its later XLSX/Timesheet addendum verbatim.
Added known recent banking, rounding, build-report and recovery-design information.
All identifiable history in the available ledger/conversation is preserved, but missing
historical chats, raw logs and screenshots were NOT recovered or invented.
This delivered document is not yet saved/committed in the user's local repository.
Release verdict remains NOT ESTABLISHED; this is an evidence/handoff record.
### BUILD-02 — Latest supplied local verification log

Recorded: 2026-11-23, UTC+06:00
Evidence: User-pasted terminal output
Project: C:/ALIMXL
Branch shown: main
Package version shown: alimxl@4.0.0
Commit/build hash: NOT RECORDED

1. npm run typecheck
   Result: PASS
   tsc --noEmit completed with no displayed error.

2. npx eslint app/page.tsx
   Result: PASS for the specified file.
   No ESLint error/warning diagnostics displayed.
   Babel emitted a code-generation styling note because
   app/page.tsx exceeds 500KB.

3. npm run build
   Result: PASS
   Next.js 16.4.5 (Turbopack).
   Compiled successfully in 11.4s.
   Build TypeScript phase completed.
   Static page generation completed: 19/19.
   Final page optimization completed.

Scope and limitations:
- This is direct supplied terminal evidence, replacing the
  earlier user-report-only status for these three commands.
- ESLint was run against app/page.tsx, not the entire project.
- No automated test-suite command appears in this log.
- No fresh browser/manual regression is established by this log.
- Exact source diff and commit are not recorded.
- No production-readiness or all-features-pass claim is made.