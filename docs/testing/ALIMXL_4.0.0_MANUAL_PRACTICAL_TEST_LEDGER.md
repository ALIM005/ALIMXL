ALIM XL — Completed Manual & Practical Test Results
ডকুমেন্ট সংস্করণ: 1.8
আপডেট: 26 November 2026
অ্যাপ্লিকেশন: ALIM XL 4.0.0
পরীক্ষার পরিবেশ: Browser / localhost:3000

এই পেজের উদ্দেশ্য
শুধু সম্পন্ন ও সফল manual/practical পরীক্ষার ফল সংরক্ষণ।

প্রতিটি PASS সংশ্লিষ্ট নির্দিষ্ট input, action ও expected result-এর জন্য প্রযোজ্য।
এটি পুরো সফটওয়্যারের সব পরিস্থিতিতে 100% নির্ভুলতার সার্টিফিকেট নয়।

এই পেজে pending, incomplete, prepared-only বা inconclusive পরীক্ষা completed test হিসেবে রাখা হয়নি।

কোনো completed test-এর সীমা বোঝাতে scope clarification থাকতে পারে।
সেগুলো পৃথক completed test নয়।

Automated test, lint, typecheck ও build-এর ফল পৃথক technical report-এর বিষয়।

প্রমাণের ধরন:

Screenshot: দৃশ্যমান ফল যাচাই করা হয়েছে।

User confirmation: ব্যবহারকারী পরীক্ষা করে সফলতা নিশ্চিত করেছেন।

Recorded history: আগের পরীক্ষার সংরক্ষিত সারাংশে সফলতা নথিভুক্ত আছে।

নতুন keyboard পরীক্ষার কিছু ফল ব্যবহারকারী সম্মিলিতভাবে সফল বলেছেন।
সেগুলোর জন্য আলাদা screenshot বা অতিরিক্ত বিস্তারিত input/output পাওয়া গেছে বলে দাবি করা হয়নি।

1. Row Insert / Delete এবং Undo / Redo
STRUCT-01 — Row Insert
Status: PASS
Evidence: Recorded history / user-confirmed results

কাজ:
Row 3 insert করে New Product / 50 যোগ করা।

সফল ফল:

Total = 650

Total formula =SUM(B2:B5)

Product C Reference = 300

Reference formula =B5

STRUCT-02 — Insert করা Row Delete
Status: PASS
Evidence: Recorded history / user-confirmed results

কাজ:
যোগ করা Row 3 delete করা।

সফল ফল:

Total = 600

Total formula =SUM(B2:B4)

Product C Reference = 300

Reference formula =B4

STRUCT-03 — নির্দিষ্ট Row পরিবর্তনের Undo / Redo
Status: PASS
Evidence: Recorded history / user confirmation

সফল ফল:
পরীক্ষিত row insert/delete sequence-এর সংশ্লিষ্ট data,
calculated value এবং formula reference সঠিকভাবে ফিরে এসেছে।

2. খালি Column Insert / Delete
STRUCT-04 — Amount-এর আগে Column Insert
Status: PASS
Evidence: Screenshot / user confirmation

কাজ:
B column-এ Insert Columns Before।

সফল ফল:

B column খালি হয়েছে।

Amount-এর data C column-এ গেছে।

C5 = 600

C5 formula =SUM(C2:C4)

C6 = 300

C6 formula =C4

STRUCT-05 — নতুন খালি Column Delete
Status: PASS
Evidence: Screenshot for values / user confirmation for formulas

কাজ:
নতুন যোগ করা খালি B column delete করা।

সফল ফল:

Amount-এর data B column-এ ফিরেছে।

B5 = 600

B5 formula =SUM(B2:B4)

B6 = 300

B6 formula =B4

3. Sheet Reference / Rename / Undo / Redo
SHEET-01 — সঠিক Sheet Name দিয়ে Reference
Status: PASS
Evidence: Screenshot

Sheet:
Sheet 1

D1 formula:
='Sheet 1'!B5

সফল ফল:
D1 = 600

SHEET-02 — Sheet Rename করলে Formula আপডেট
Status: PASS
Evidence: Screenshot

কাজ:
Sheet 1-এর নাম SalesData করা হয়েছে।
D1-এর formula ম্যানুয়ালি পরিবর্তন করা হয়নি।

সফল ফল:

Sheet name = SalesData

D1 formula =SalesData!B5

D1 value = 600

SHEET-03 — Sheet Rename-এর Undo / Redo
Status: PASS — User Confirmed
Evidence: User confirmation; screenshot supports undo name/value

সফল ফল:
ব্যবহারকারী নির্দিষ্ট rename পরীক্ষায় Undo ও Redo দুটিই
কাজ করছে বলে নিশ্চিত করেছেন।

Undo screenshot-এ:

Sheet name = Sheet 1

D1 value = 600

4. Source পরিবর্তনের পর Recalculation
RECALC-01 — Source Value থেকে Dependent Result আপডেট
Status: PASS
Evidence: Screenshot

কাজ:
B4-এর Product C amount 300 থেকে 350 করা হয়েছে।

সফল ফল:

B5 Total = 650

B5 formula =SUM(B2:B4)

B6 Product C Reference = 350

D1 sheet-name reference result = 650

5. Banking Practical Tests
BANK-01 — Bank Baseline / Reconciliation
Status: PASS
Evidence: Screenshot

সফল ফল:

CASH = 105500

BANK = 62800

Total = 168300

Matched transactions = 10

Balance differences = 0

Overall audit = PASS

BANK-02 — মোট অপরিবর্তিত থাকলেও দুটি ভুল শনাক্ত
Status: PASS — Negative Test
Evidence: Screenshot

কাজ:
দুটি transaction amount বিপরীত দিকে 100 করে পরিবর্তন করা।

সফল ফল:

মোট BANK balance = 62800 অপরিবর্তিত।

মোট balance difference = 0।

Matched transactions 10 থেকে 8 হয়েছে।

Audit overall FAIL দেখিয়ে ভুল শনাক্ত করেছে।

নোট:
এই পরীক্ষায় application-এর ভুল শনাক্ত করাই সফল ফল।

BANK-03 — Mismatch Detail / Recovery
Status: PASS
Evidence: User confirmation

সফল ফল:

BANK|T001 difference = +100

BANK|R002 difference = -100

মূল data restore করলে matched count = 10

Overall audit = PASS

BANK-04 — Reconciliation Formula Fill
Status: PASS
Evidence: Recorded screenshot assessment

কাজ:
A2:G2-এর reconciliation formula row 11 পর্যন্ত fill করা।

সফল ফল:
Matched count = 10।

BANK-05 — Opening/Input Balance পরিবর্তন
Status: PASS
Evidence: Recorded history

কাজ:
I2-এর value 5000 থেকে 6000 করা।

সফল ফল:

J2:J11-এর প্রতিটি value 1000 বেড়েছে।

J12:J15 অপরিবর্তিত থেকেছে।

6. Student Results Practical Tests
এই fixture-এর নিজস্ব নিয়ম:
পাঁচ বিষয়ে প্রতিটিতে অন্তত 33 পেতে হবে।
AB হলে ABSENT।
এক বিষয়ে ফেল করলে বেশি total থাকলেও FAIL।
শুধু PASS শিক্ষার্থীদের competition rank দেওয়া হয়েছে।

RES-01 — Ten-Student Baseline
Status: PASS
Evidence: Screenshot

সফল ফল:

7 PASS

2 FAIL

1 ABSENT

প্রদর্শিত total, average, result, grade ও rank সঠিক।

RES-02 — বেশি Total হলেও এক বিষয়ে Fail
Status: PASS
Evidence: Screenshot

Input:
100, 100, 100, 100, 32

সফল ফল:

Total = 432

Average = 86.4

Failed subjects = 1

Result = FAIL

Grade = F

Rank দেওয়া হয়নি।

RES-03 — Exact Pass Boundary
Status: PASS
Evidence: Screenshot

Input:
33, 33, 33, 33, 33

সফল ফল:

Total = 165

Average = 33

Result = PASS

Grade = D

Baseline rank = 7

RES-04 — Absence Handling
Status: PASS
Evidence: Screenshot

Input:
70, 65, AB, 80, 75

সফল ফল:

Absent subjects = 1

Total / Result / Grade = ABSENT

Average খালি।

Rank দেওয়া হয়নি।

AB lookup-এর মাধ্যমে ঠিকভাবে এসেছে।

RES-05 — Tied Rank এবং Exclusion
Status: PASS
Evidence: Screenshot

সফল ফল:

Rahim, Karim ও Rafi: total 400, rank 1।

Mitu: total 395, rank 4।

FAIL ও ABSENT শিক্ষার্থী rank থেকে বাদ।

RES-06 — Source Mutation / Rerank
Status: PASS
Evidence: Screenshot

কাজ:
Ayesha-এর সংশ্লিষ্ট mark 32 থেকে 33 করা।

সফল ফল:

Total = 433

Average = 86.6

Failed subjects = 0

Result = PASS

Grade = A+

Rank = 1

সংশ্লিষ্ট অন্য শিক্ষার্থীদের rank সঠিকভাবে বদলেছে।

RES-07 — Result Recovery
Status: PASS
Evidence: User confirmation

সফল ফল:
মূল mark restore করার পর আগের result এবং
নির্ধারিত audit checks সঠিক হয়েছে বলে ব্যবহারকারী নিশ্চিত করেছেন।

RES-08 — Mark 101 হলে Publication Block
Status: PASS — Negative Test
Evidence: User confirmation

কাজ:
নির্দিষ্ট subject mark 79 থেকে 101 করা।

সফল ফল:
নির্ধারিত validation CHECK / publication BLOCKED এবং
সংশ্লিষ্ট rank পরিবর্তন সঠিক হয়েছে বলে ব্যবহারকারী নিশ্চিত করেছেন।

7. Sales / Lookup Practical Tests
SALE-01 — Sales / Report Baseline
Status: PASS
Evidence: Recorded history

সফল ফল:
16 sales row-এর নির্ধারিত cross-sheet SUM / SUMIF,
reconciliation এবং প্রাথমিক 14টি check সফল হিসেবে নথিভুক্ত।

SALE-02 — Sales Source Mutation
Status: PASS
Evidence: Recorded history

কাজ:
Sales!D2-এর value 10 থেকে 100 করা।

সফল ফল:

Report!B2 = 261

Report!B4 = 21587

SALE-03 — Sales Undo
Status: PASS
Evidence: Recorded history

সফল ফল:
ওই source edit Undo করলে report আগের মানে ফিরেছে
এবং সংশ্লিষ্ট checks আবার PASS হয়েছে।

LOOK-02 — Normal / Absolute VLOOKUP
Status: PASS
Evidence: Recorded history

সফল ফল:
পরীক্ষিত normal এবং absolute-reference VLOOKUP
দুটিই প্রত্যাশিত Rahim result দিয়েছে।

LOOK-03 — Lookup Source Propagation
Status: PASS
Evidence: Recorded history

কাজ:
Staff!B2-এর Rahim বদলে Rahim SOURCE করা।

সফল ফল:
WorkLog!H2, B8 এবং B9-এ পরিবর্তিত নাম পৌঁছেছে।

LOOK-04 — Local / Cross-Sheet Isolation
Status: PASS
Evidence: User confirmation recorded in history

সফল ফল:
পরীক্ষিত local এবং cross-sheet lookup isolation সফল
বলে ব্যবহারকারী নিশ্চিত করেছেন।

8. নির্দিষ্ট Selection / Paste / Undo Tests
UI-02 — Erroneous Fill Undo
Status: PASS
Evidence: Screenshots

সফল ফল:
Undo-এর পর পরীক্ষিত record-এ:

পাঁচটি mark = 80

Total = 400

Average = 80

Result = PASS

Grade = A+

Rank = 1

UI-03 — Results TSV Paste
Status: PASS
Evidence: Screenshot

সফল ফল:
C3:O11 range-এ 9 row × 13 column-এর TSV data
প্রত্যাশিত পৃথক cell-এ বসেছে।

UI-04 — Sheet Rename / Displayed Identity
Status: PASS
Evidence: Screenshots

সফল ফল:
পরীক্ষিত Payroll ও PayrollAudit sheet rename-এর পর
নতুন tab name এবং নিজ নিজ দৃশ্যমান content বজায় ছিল।

UI-05 — Ten-Record Payroll Formula Paste
Status: PASS
Evidence: Screenshot

সফল ফল:
Header এবং 10 record × 20 column-এর পরীক্ষিত
paste ও displayed calculation সঠিক ছিল।

9. Payroll — সম্পন্ন নির্দিষ্ট পরীক্ষাগুলো
PAY-02 — First Ten Payroll Records
Status: PASS
Evidence: Screenshots

সফলভাবে যাচাই করা Net Pay:

E001 = 19848.56
E002 = 20163.85
E003 = 20445.87
E004 = 20874.62
E005 = 25373.75
E006 = 24220.38
E007 = 23283.75
E008 = 24918.85
E009 = 24229.42
E010 = 29297.50

পরীক্ষার পরিধি:
এই দশটি record।

PAY-03 — Multiple Adjustment Aggregation
Status: PASS
Evidence: Screenshot

সফল ফল:

E005 bonus: 125 + 1125 = 1250

E010 bonus: 900 + 125 = 1025

10. ROUND — Eight-Case Practical Regression
ROUND-02
Status: PASS
Evidence: Screenshot of matching Actual / Expected pairs

Case Actual Expected
Direct 53.87 53.87
Calculated 53.87 53.87
Negative calculated -53.87 -53.87
Below boundary 53.86 53.86
Above boundary 53.87 53.87
Positive half 3 3
Negative half -3 -3
Negative digits 1300 1300

পরীক্ষার পরিধি:
প্রদর্শিত আটটি Actual / Expected pair।

11. Styled XLSX Import / Colour Copy-Paste
XLSX-MANUAL-01 — Styled Timesheet Import
Status: PASS — Observed Area
Evidence: Screenshot

সফল ফল:

Weekly Timesheet sheet name এসেছে।

Title ও instruction row এসেছে।

Data পৃথক column-এ বসেছে।

Teal header ও সাদা লেখা এসেছে।

নীল, গোলাপি, বেগুনি, হলুদ এবং সবুজ fills দেখা গেছে।

দৃশ্যমান borders ও differentiated column widths এসেছে।

প্রথম কর্মীর যাচাই করা ফল:

Total Hours = 52

OT Hours = 4

Rate/Hour = 120

Regular Pay = 5760

OT Pay = 720

Total Pay = 6480

পরীক্ষার পরিধি:
স্ক্রিনশটে দৃশ্যমান imported area ও উল্লিখিত হিসাব।

COLOUR-COPY-01 — Selected Cross-Sheet Colour Copy/Paste
Status: PASS
Evidence: Screenshot / explicit user confirmation

কাজ:
Weekly Timesheet-এর নির্বাচিত অংশ একই workbook-এর
Sheet 2-এ copy/paste করা।

সফল ফল:

নির্বাচিত header ও 14 কর্মীর data পৃথক cell-এ বসেছে।

Header-এর teal background ও white text বজায় ছিল।

সংশ্লিষ্ট নীল, গোলাপি, বেগুনি, হলুদ ও সবুজ fills বজায় ছিল।

দৃশ্যমান borders বজায় ছিল।

যতটুকু select/copy করা হয়েছে, ততটুকুই paste হয়েছে।

12. Other Completed Manual Checks
GEN-02 — Basic SEQUENCE Spill
Status: PASS
Evidence: Recorded history

Formula:
=SEQUENCE(3)

সফল ফল:
J1:J3-এ 1, 2, 3 দেখিয়েছে।

GEN-04 — Save / Restore
Status: COMPLETED — User Reported
Evidence: User confirmation recorded in history

ব্যবহারকারী পূর্বেই Save / Restore পরীক্ষা সম্পন্ন করেছেন
বলে নিশ্চিত করেছেন। নির্দিষ্ট assertion-এর অতিরিক্ত বিবরণ
যোগ বা অনুমান করা হয়নি।

13. Horizontal Formula Fill
FILL-01 — Horizontal Fill Right / Relative Formula Reference
Status: PASS — Manual & Practical Completed
Date: 24 November 2026, 12:40 PM UTC+06:00
Environment: Browser / localhost:3000
Evidence: Screenshot + user confirmation

প্রাথমিক data:

H1 = 10

I1 = 20

J1 = 30

H2 formula =H1*2

কাজ:
H2:J2 select করে Sheet → Fill Right ব্যবহার করা হয়েছে।
Destination cell-এ formula ম্যানুয়ালি লেখা হয়নি।

সফল ফল:

Cell Value Formula
H2 20 =H1*2
I2 40 =I1*2
J2 60 =J1*2

যাচাই:

তিনটি cell-এর selection সঠিক ছিল।

বাঁ পাশের H2 source থেকে ডান দিকে fill হয়েছে।

Relative column reference H → I → J অনুযায়ী বদলেছে।

তিনটি calculated value প্রত্যাশিত ফলের সঙ্গে মিলেছে।

J2 formula screenshot-এ এবং I2 formula ব্যবহারকারীর
নিশ্চিতকরণে যাচাই হয়েছে।

পরিধি:
একটি row-এ single-source formula Fill Right।

14. Keyboard Navigation / Selection
Date: 24 November 2026
Environment: Browser / localhost:3000

Evidence:
এই বিভাগের নতুন record-গুলো ব্যবহারকারীর পরীক্ষার
সফলতার নিশ্চিতকরণের ভিত্তিতে সংরক্ষিত।

কিছু ফল সম্মিলিতভাবে নিশ্চিত করা হয়েছে।
আলাদা screenshot বা নতুন বিস্তারিত ফল অনুমান করা হয়নি।

KEY-01 — Ctrl + Down: Data Boundary / Last Row
Status: PASS — User Confirmed
Evidence: User confirmation

প্রাথমিক data:

A1 = 1

A2 = 2

A3 = 3

A4:A5 খালি

A6 = 6

কাজ:
A1 থেকে পর্যায়ক্রমে Ctrl + Down ব্যবহার করা।

সফল ফল:

প্রথমবার A3 selected।

দ্বিতীয়বার A6 selected।

তৃতীয়বার A1000000 selected।

দূরের selected cell অনুযায়ী viewport নিচে গেছে।

পরিধি:
এই data layout-এ downward boundary navigation এবং
last-row visibility।

KEY-02 — Ctrl + Home
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
দূরের row থেকে Ctrl + Home ব্যবহার করা।

সফল ফল:

A1 selected।

Viewport sheet-এর ওপরের অংশে ফিরে এসেছে।

KEY-03 — Ctrl + End
Status: PASS — User Confirmed
Evidence: User confirmation

প্রাথমিক data:

A1:A3 = 1, 2, 3

A6 = 6

B1 = 10

C1 = 20

কাজ:
AutoSum দিয়ে নতুন data যোগ করার আগের fixture-এ
Ctrl + End ব্যবহার করা।

সফল ফল:
C6 selected হয়েছে।

পরিধি:
এই fixture-এর ব্যবহৃত range-এর শেষ কোণা।

KEY-04 — Tab / Shift + Tab: Non-Editing
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
খালি sheet-এ A1-এ একবার click করে Tab,
তারপর Shift + Tab ব্যবহার করা।

সফল ফল:

Tab: A1 থেকে B1।

Shift + Tab: B1 থেকে A1।

কোনো data লেখা প্রয়োজন হয়নি।

পরিধি:
Cell edit না করে সাধারণ selection অবস্থায় navigation।

KEY-05 — Shift + Arrow: ছোট Range Selection
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
A1 থেকে Shift + Right দুবার ব্যবহার করা।

সফল ফল:
A1:C1-এর তিনটি cell একসঙ্গে selected হয়েছে।

KEY-06 — সাধারণ Arrow Navigation
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
Up / Down / Left / Right ব্যবহার করা।

সফল ফল:
পরীক্ষিত direction অনুযায়ী পাশের cell-এ selection গেছে।

KEY-07 — Enter / Shift + Enter
Status: PASS — User Confirmed
Evidence: User confirmation

দেওয়া পরীক্ষা:
B2 থেকে Enter, তারপর Shift + Enter ব্যবহার করা।

সফল ফল:
পরীক্ষাটি সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

প্রত্যাশিত আচরণ:

B2 থেকে B3।

B3 থেকে আবার B2।

KEY-08 — Editing অবস্থায় Tab
Status: PASS — User Confirmed
Evidence: User confirmation

দেওয়া পরীক্ষা:
B2 edit করে 25 লিখে Tab ব্যবহার করা।

সফল ফল:
পরীক্ষাটি সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

প্রত্যাশিত আচরণ:

B2-তে লেখা সংরক্ষণ।

C2-তে selection যাওয়া।

KEY-09 — Editing অবস্থায় Shift + Tab
Status: PASS — User Confirmed
Evidence: User confirmation

দেওয়া পরীক্ষা:
C2 edit করে 30 লিখে Shift + Tab ব্যবহার করা।

সফল ফল:
পরীক্ষাটি সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

প্রত্যাশিত আচরণ:

C2-তে লেখা সংরক্ষণ।

B2-তে selection যাওয়া।

পরিধি:
পরীক্ষিত cell-editor পথে commit এবং বাঁদিকে navigation।

KEY-10 — F2: Cell Edit Mode
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
Cell নির্বাচন করে F2 ব্যবহার করা।

সফল ফল:
বর্তমান cell-এর লেখা edit করা গেছে বলে নিশ্চিত করেছেন।

KEY-11 — Escape: Edit বাতিল
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
বিদ্যমান value edit করে পরিবর্তনের পরে Esc ব্যবহার করা।

সফল ফল:
চলমান পরিবর্তন বাতিল হয়ে আগের value বজায় থেকেছে
বলে ব্যবহারকারী নিশ্চিত করেছেন।

KEY-12 — বিপরীত ও অনুভূমিক Boundary Navigation
Status: PASS — User Confirmed
Evidence: User confirmation

পরীক্ষিত shortcuts:

Ctrl + Up

Ctrl + Left

Ctrl + Right

সফল ফল:
দেওয়া boundary-navigation পরীক্ষাগুলো সফল বলে
ব্যবহারকারী নিশ্চিত করেছেন।

পরিধি:
প্রতিটি direction-এর পৃথক destination address
আলাদাভাবে নথিভুক্ত হয়নি।
সব possible data layout-এর দাবি নয়।

KEY-13 — Ctrl + Shift + Arrow
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
Boundary পর্যন্ত selection বাড়ানোর পরীক্ষা।

সফল ফল:
পরীক্ষিত selection extension সফল বলে নিশ্চিত করেছেন।

পরিধি:
সব data layout বা hidden/merged-cell পরিস্থিতির দাবি নয়।

15. Keyboard Clipboard / Editing / Formatting
Date: 24 November 2026
Environment: Browser / localhost:3000

এই বিভাগের ফল ব্যবহারকারীর সম্মিলিত successful-test
confirmation-এর ভিত্তিতে নথিভুক্ত।

আলাদা বিস্তারিত ফল না থাকলে অতিরিক্ত cell address,
value বা screenshot verification অনুমান করা হয়নি।

KEY-14 — Keyboard Copy / Paste
Status: PASS — User Confirmed
Evidence: User confirmation

Shortcuts:

Ctrl + C

Ctrl + V

সফল ফল:
পরীক্ষিত Copy/Paste action সফল বলে নিশ্চিত করেছেন।

পরিধি:
পরীক্ষিত workflow; সব external clipboard format
বা browser permission পরিস্থিতির দাবি নয়।

KEY-15 — Keyboard Cut / Paste
Status: PASS — User Confirmed
Evidence: User confirmation

Shortcuts:

Ctrl + X

Ctrl + V

সফল ফল:
পরীক্ষিত Cut/Paste action সফল বলে নিশ্চিত করেছেন।

KEY-16 — Keyboard Undo / Redo
Status: PASS — User Confirmed
Evidence: User confirmation

Shortcuts:

Ctrl + Z

Ctrl + Y

সফল ফল:
পরীক্ষিত পরিবর্তন Undo ও Redo করা গেছে বলে
ব্যবহারকারী নিশ্চিত করেছেন।

পরিধি:
এই session-এর keyboard tests।
আগের structural Undo/Redo record-গুলোর পরিপূরক।

KEY-17 — Delete / Backspace
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
Selected cell-এর content clear করা।

সফল ফল:
দেওয়া পরীক্ষাগুলো সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

পরিধি:
পরীক্ষিত ছোট selection।
Whole-sheet clear বা বড় selection coverage নয়।

KEY-18 — Ctrl + F: Find
Status: PASS — User Confirmed
Evidence: User confirmation

কাজ:
Ctrl + F দিয়ে দেওয়া Find পরীক্ষা করা।

সফল ফল:
পরীক্ষাটি সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

পরিধি:
সব search option বা দূরের match-এর viewport
navigation আলাদাভাবে প্রতিষ্ঠিত নয়।

KEY-19 — Keyboard Formatting
Status: PASS — User Confirmed
Evidence: User confirmation

Shortcuts:

Ctrl + B: Bold

Ctrl + I: Italic

Ctrl + U: Underline

সফল ফল:
দেওয়া formatting পরীক্ষাগুলো সফল বলে নিশ্চিত করেছেন।

পরিধি:
পরীক্ষিত ছোট selection; whole-sheet formatting নয়।

KEY-20 — Alt + =: AutoSum
Status: PASS — User Confirmed
Evidence: User confirmation

প্রাথমিক data:

A1 = 1

A2 = 2

A3 = 3

A4 খালি

কাজ:
A4 নির্বাচন করে Alt + = ব্যবহার করা।

সফল ফল:
দেওয়া পরীক্ষাটি সফল বলে ব্যবহারকারী নিশ্চিত করেছেন।

পরীক্ষার প্রত্যাশিত ফল:

A4 = 6

Formula =SUM(A1:A3)

16. Updated Ctrl + A — Whole-Sheet Selection
SEL-01 — সম্পূর্ণ Logical Sheet Range নির্বাচন
Status: PASS — User Confirmed
Date: 24 November 2026
Environment: Browser / localhost:3000
Evidence: User confirmation after targeted code change

পরিবর্তন:
শুধু selectAllCells() function-এর ছোট replacement।
সম্পূর্ণ page file বা ZIP replacement নয়।

কাজ:
Update-এর পরে Ctrl + A দিয়ে selection পরীক্ষা।

সফল ফল:
ব্যবহারকারী সর্বশেষ দেওয়া selection পরীক্ষাটিও
সফল বলে নিশ্চিত করেছেন।

পরীক্ষার প্রত্যাশিত আচরণ:

প্রথম কয়েকটি row নয়, পুরো logical sheet range নির্বাচন।

আগের active cell অপরিবর্তিত রাখা।

অতিরিক্ত Ctrl-selection পরিষ্কার করা।

পরিধি:
এই PASS শুধু selection আচরণের জন্য।

এটি দিয়ে নিচের বিষয়গুলো PASS ঘোষণা করা হয়নি:

Whole-sheet Copy/Cut।

Whole-sheet Delete/Clear।

Whole-sheet formatting।

পুরো selection-এর পূর্ণ numeric statistics।

আগের 50,000-cell processing সীমা অপসারণ।

এগুলো পরীক্ষার scope clarification;
completed test হিসেবে গণনা করা হয়নি।

সংস্করণ 1.6 — সংযোজনের সারাংশ
আগের সংস্করণ 1.5-এর সব test record বহাল।

FILL-01-এর মূল input, action, ফল ও evidence বহাল।

KEY-01 থেকে KEY-20: 20টি নতুন test record।

SEL-01: 1টি নতুন selection test record।

নতুন সংযোজন: মোট 21টি record।

নতুন keyboard record-গুলোর evidence: User confirmation।

সম্মিলিত confirmation-কে পৃথক screenshot বলা হয়নি।

নতুন automated/lint/typecheck/build PASS যোগ করা হয়নি।

পুরো software-এর সব পরিস্থিতিতে নির্ভুলতার দাবি করা হয়নি।

নোট:
একটি record-এর মধ্যে একাধিক key, case বা assertion থাকতে পারে।
তাই record সংখ্যা এবং individual assertion সংখ্যা এক নয়।
পুরোনো test ID-এর ফাঁক পূরণ করে নতুন পরীক্ষা বানানো হয়নি।

17. Updated Sheet Limits / Last-Cell Calculation
CAP-01 — Updated Row/Column Limits এবং Last-Cell Calculation
Status: PASS — Observed
Evidence: Screenshot assessment recorded in conversation history

পরীক্ষিত logical sheet সীমা:

Rows = 2,000,000

Columns = 100,000

শেষ cell = EQXD2000000

কাজ:
শেষ cell EQXD2000000-এ পৌঁছে নিচের formula ব্যবহার করা:

=10+20

সফল ফল:

EQXD2000000 cell-এ পৌঁছানো গেছে।

Formula-এর ফল = 30।

পরীক্ষার পরিধি:
Updated logical sheet-এর শেষ cell-এ পৌঁছানো এবং
সেখানে সাধারণ arithmetic calculation।

এই পরীক্ষায় নিচের বিষয়গুলো PASS ঘোষণা করা হয়নি:

পুরো sheet data দিয়ে পূর্ণ করা।

পূর্ণ capacity-তে calculation performance।

Whole-sheet Copy/Cut/Delete/Formatting।

সব cell-এর পূর্ণ numeric statistics।

ঐতিহাসিক scope clarification:
KEY-01-এ A1000000 destination আগের পরীক্ষার সময়কার
পর্যবেক্ষণ হিসেবে অপরিবর্তিত থাকবে।

বর্তমান updated limit-এ Ctrl + Down দিয়ে
A2000000-এ পৌঁছানোর পৃথক পরীক্ষা সম্পন্ন হয়েছে
বলে এই record দাবি করছে না।

18. Five-Person Timesheet Calculation
CALC-05 — Five-Person Timesheet / Hours and Amount
Status: PASS — Observed
Evidence: Screenshot assessment recorded in conversation history

কাজ:
A1 থেকে পাঁচজনের পরীক্ষিত timesheet data ও হিসাব বসানো।

প্রত্যাশিত ফল:

মোট Hours = 40

মোট Amount = 4,000

সফল ফল:

পাঁচজনের পৃথক Amount সঠিক পাওয়া গেছে।

মোট Hours = 40

মোট Amount = 4,000

পরীক্ষার পরিধি:
এই পাঁচজনের নির্দিষ্ট timesheet fixture।

Scope clarification:
এই PASS আগের ৫০ জনের timesheet-এর
40,000 বনাম 39,100 অমিল সমাধান হয়েছে—এমন প্রমাণ নয়।
ওই অমিল পৃথক working list-এর বিষয়।

19. Currency Formatting / Formula Result
Date: 25 November 2026
Environment: Browser / localhost:3000

CUR-01 — USD Formatting with SUM Formula
Status: PASS — Observed
Evidence: Screenshots

পরীক্ষার data:

A1 = Amount

A2 = 100

A3 = 250

A4 formula =SUM(A2:A3)

কাজ:
A2:A4 select করে US Dollar currency format প্রয়োগ করা।

সফল ফল:

A2 = $100.00

A3 = $250.00

A4 = $350.00

অতিরিক্ত দৃশ্যমান যাচাই:

A2 selected অবস্থায় formula bar-এ মূল value 100।

A4 selected অবস্থায় formula bar-এ =SUM(A2:A3)।

A4-এর calculated result = $350.00।

শুধু A4 selected থাকলে status bar:
Count = 1, Sum = 350, Average = 350,
Min = 350, Max = 350।

পরীক্ষার পরিধি:
তিনটি নির্বাচিত cell-এ USD display formatting এবং
উল্লিখিত SUM formula-এর সঠিক ফল।

CUR-02 — BDT Formatting / Unchanged Numeric Amount
Status: PASS — Observed
Evidence: Screenshot

কাজ:
পরীক্ষিত A2:A4 range-এ Bangladeshi Taka currency format
প্রয়োগ করা।

সফল ফল:

100, 250 ও 350 বাংলা অঙ্ক এবং ৳ চিহ্নে দেখা গেছে।

প্রদর্শিত পরিমাণ যথাক্রমে 100, 250 ও 350-ই ছিল।

A2 selected অবস্থায় formula bar-এ মূল value 100।

Toolbar-এ BDT প্রদর্শিত হয়েছে।

পরীক্ষার পরিধি:
এই তিনটি cell-এ BDT display formatting।
পরীক্ষিত পরিমাণে exchange-rate conversion ঘটেনি।

এই record দিয়ে নিচের বিষয়গুলো PASS ঘোষণা করা হয়নি:

বাস্তব exchange-rate conversion।

সব currency-এর formatting।

Dropdown search-এর কার্যকারিতা।

নির্বাচিত currency-এর tick indicator।

শুধু একটি cell-এর format বদলালে অন্য cell-এর isolation।

সংস্করণ 1.7 — সংযোজনের সারাংশ
সংস্করণ 1.6-এর সব test record ও বিস্তারিত বহাল।

CAP-01: Updated sheet limits ও last-cell calculation।

CALC-05: Five-person timesheet calculation।

CUR-01: USD formatting এবং SUM formula result।

CUR-02: BDT formatting ও unchanged numeric amount।

নতুন সফল সংযোজন: মোট 4টি test record।

Design-only পরিবর্তন completed test হিসেবে যোগ করা হয়নি।

৫০ জনের timesheet-এর unresolved mismatch
Completed Results-এ সফল record হিসেবে যোগ করা হয়নি।

নতুন automated/lint/typecheck/build PASS যোগ করা হয়নি।

পুরোনো KEY-01-এর destination নতুন limit অনুযায়ী
পরীক্ষা ছাড়া পরিবর্তন করা হয়নি।

20. Formula Practical Tests — Scalar
Date: 26 November 2026
Environment: Browser / localhost:3000
Evidence: Screenshots + print করা PDF

Fixture: A1:C6 = (10,5,Apple) থেকে (60,55,Fig)।
সূত্র E কলামে, প্রত্যাশিত ফল G কলামে।

FN2-01 — LET
Status: PASS
Evidence: Screenshot / PDF

=LET(x,5,x*2) = 10

=LET(a,A1,b,B1,a+b) = 15

=LET(x,A1:A3,SUM(x)) = 60

FN2-02 — ISFORMULA
Status: PASS
Evidence: Screenshot / PDF

সূত্রযুক্ত ঘর = TRUE

সাধারণ মানযুক্ত ঘর = FALSE

FN2-03 — Normal Distribution
Status: PASS
Evidence: Screenshot / PDF

NORM.S.DIST(0,TRUE) = 0.5

NORM.DIST(60,50,10,TRUE) = 0.8413447461

NORM.S.INV(0.975) = 1.9599639845

NORM.INV(0.5,100,15) = 100

STANDARDIZE(60,50,10) = 1

FN2-04 — Statistical
Status: PASS
Evidence: Screenshot / PDF

KURT(A1:A6) = -1.2

MAXA = 60, MINA = 1

AVERAGEA(A1:C2) = 8.3333333333

STDEVA = 18.7082869339, VARA = 350

COVARIANCE.P = 291.6666666667, COVARIANCE.S = 350

PERCENTILE.EXC = 35, QUARTILE.EXC = 17.5

PERCENTRANK.EXC = 0.428, PERCENTRANK = 0.4

FN2-05 — Hyperbolic / Trigonometric / Math
Status: PASS
Evidence: Screenshot / PDF

SINH(1) = 1.1752011936; COSH(1) = 1.5430806348;
TANH(1) = 0.761594156; ASINH(1) = 0.881373587;
ACOSH(2) = 1.3169578969; ATANH(0.5) = 0.5493061443;
SQRTPI(2) = 2.5066282746; FACTDOUBLE(7) = 105;
SEC(0) = 1; CSC(PI()/2) = 1; COT(PI()/4) = 1

FN2-06 — Bit Functions
Status: PASS
Evidence: Screenshot / PDF

BITAND(12,10) = 8; BITOR = 14; BITXOR = 6;
BITLSHIFT(1,4) = 16; BITRSHIFT(16,2) = 4;
DELTA(5,5) = 1; GESTEP(3,5) = 0

FN2-07 — Base Conversion এবং RRI
Status: PASS
Evidence: Screenshot / PDF

BIN2DEC(1010) = 10; DEC2BIN(10) = 1010;
DEC2BIN(10,8) = 00001010; HEX2DEC("FF") = 255;
DEC2HEX(255) = FF; OCT2DEC(17) = 15; DEC2OCT(8) = 10;
DEC2BIN(-1) = 1111111111; HEX2DEC("FFFFFFFFFF") = -1;
RRI(10,1000,2000) = 0.0717734625

FN2-08 — Negative / Error Tests
Status: PASS — Negative Test
Evidence: Screenshot / PDF

সঠিক error দেখানোই সফল ফল:

NORM.S.INV(1) = #NUM!

DEC2BIN(512) = #NUM!

BITAND(-1,2) = #NUM!

SKEW(A1:A2) = #DIV/0!

LET(x,1) = #VALUE!

FOOBAR(1) = #NAME?

HEX2DEC("GG") = #NUM!

FN2-09 — Nested এবং পুরনো সূত্র
Status: PASS
Evidence: Screenshot / PDF

SUM(BITAND(12,10),BITOR(12,10)) = 22

LET(x,NORM.S.INV(0.5),x+1) = 1

SUM(A1:A6) = 210

VLOOKUP(30,A1:C6,3,FALSE) = Cherry

IF(A1>5,"yes","no") = yes

TEXT(12.5,"0.00") = 12.50

21. Formula Practical Tests — Array / Spill
Date: 26 November 2026
Environment: Browser / localhost:3000
Evidence: Screenshots + print করা PDF

FN2-10 — HSTACK / VSTACK
Status: PASS

HSTACK(A1:A3,B1:B3) = (10,5),(20,15),(30,25)

VSTACK(A1:B2,A5:B6) = (10,5),(20,15),(50,45),(60,55)

FN2-11 — SORTBY / RANDARRAY
Status: PASS

SORTBY(A1:B3,A1:A3,-1) = (30,25),(20,15),(10,5)

RANDARRAY(2,3,1,10,TRUE) = 2x3, ১ থেকে ১০-এর পূর্ণসংখ্যা

FN2-12 — TAKE / DROP
Status: PASS

TAKE(A1:B6,2,1) = 10, 20

DROP(A1:B6,4) = (50,45),(60,55)

FN2-13 — CHOOSECOLS / CHOOSEROWS
Status: PASS

CHOOSECOLS(A1:C3,3,1) = (Apple,10),(Banana,20),(Cherry,30)

CHOOSEROWS(A1:B6,-1,1) = (60,55),(10,5)

FN2-14 — TOCOL / TOROW
Status: PASS

TOCOL(A1:B2) = 10, 5, 20, 15

TOROW(A1:A3) = 10, 20, 30

FN2-15 — WRAPROWS / WRAPCOLS
Status: PASS

WRAPROWS(A1:A6,3) = (10,20,30),(40,50,60)

WRAPCOLS(A1:A6,3) = (10,40),(20,50),(30,60)

FN2-16 — EXPAND
Status: PASS

EXPAND(A1:B2,3,3,0) = (10,5,0),(20,15,0),(0,0,0)

Scope clarification (completed test নয়)
SKEW(A1:A6) প্রত্যাশিত 0, প্রদর্শন -0; PASS গণনা হয়নি।

সূত্র পর্দায় দৃশ্যমান ঘরে থাকা অবস্থায় পরীক্ষা হয়েছে।

G কলামের 1,010 ও 1,111,111,111 পরীক্ষার sheet-এর
প্রত্যাশিত-মান কলামের ফরম্যাট; ফলের কলামে 1010 ও 1111111111।

এই PASS শুধু উল্লিখিত fixture ও সূত্রের জন্য।

সংস্করণ 1.8 — সংযোজনের সারাংশ
সংস্করণ 1.7-এর সব test record ও বিস্তারিত বহাল।

FN2-01 থেকে FN2-09: ৯টি scalar formula record।

FN2-10 থেকে FN2-16: ৭টি array/spill formula record।

নতুন সফল সংযোজন: মোট 16টি manual/practical record।

Evidence: Screenshot ও print করা PDF।

নতুন automated/lint/typecheck/build PASS যোগ করা হয়নি।

পুরো software-এর সব পরিস্থিতিতে নির্ভুলতার দাবি করা হয়নি।

পরবর্তী আপডেটের নিয়ম
নতুন কোনো পরীক্ষা বাস্তবে সফল হলেই এই পেজে যোগ হবে।

অসম্পূর্ণ বা ব্যর্থ পরীক্ষা আলাদা working list-এ থাকবে।

Screenshot, user confirmation এবং recorded history আলাদা থাকবে।

Negative test-এ সঠিক error / rejection দেখানো সফল ফল হতে পারে।

Completed test অকারণে আবার করানো হবে না।

Code পরিবর্তনের কারণে regression দরকার হলে কারণ উল্লেখ থাকবে।

পুরোনো বিস্তারিত ledger ইতিহাস হিসেবে আলাদাভাবে সংরক্ষিত থাকবে।

নতুন সংযোজনের সময় আগের record বাদ দেওয়া হবে না।

শুধু code-এ implementation পাওয়াকে manual test PASS বলা হবে না।

বড় selection-এর PASS ছোট selection-এর ফল থেকে অনুমান করা হবে না।

— Completed Manual & Practical Results-এর সমাপ্তি