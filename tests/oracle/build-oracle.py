#!/usr/bin/env python3
"""
Batch 1 oracle builder.

LibreOffice (headless) এ প্রতিটি ফর্মুলা চালিয়ে প্রত্যাশিত ফল tests/oracle/batch1.oracle.json-এ রাখে।
সাধারণ টেস্ট (node --test) এই JSON পড়ে, তাই টেস্ট চালাতে LibreOffice লাগে না।
ফর্মুলা বদলালে/বাড়ালে শুধু এই স্ক্রিপ্ট আবার চালান:

    python3 tests/oracle/build-oracle.py

TEXTBEFORE/TEXTAFTER LibreOffice 24.8-এর আগে নেই; তাই এগুলোর প্রত্যাশিত ফল
Microsoft ডকুমেন্টেশন থেকে হাতে দেওয়া (MANUAL)।
"""
import csv, json, os, subprocess, sys, tempfile
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- ডেটা (সব টেস্টে একই) -------------------------------------------------
DATA = {
    # A: সংখ্যা (গড়=5, জনসংখ্যা-SD=2)
    **{f"A{i+1}": v for i, v in enumerate([2, 4, 4, 4, 5, 5, 7, 9])},
    # B: মিশ্র (সংখ্যা, টেক্সট, ফাঁকা, বুলিয়ান)
    "B1": 10, "B2": "abc", "B4": 20, "B5": True, "B6": 30,
    # C: ১..৫
    **{f"C{i+1}": v for i, v in enumerate([1, 2, 3, 4, 5])},
    # E: MIRR
    **{f"E{i+1}": v for i, v in enumerate([-120000, 39000, 30000, 21000, 37000, 46000])},
    # G: এররসহ (G2 = #N/A)
    "G1": 1, "G3": 3, "G4": 4,
    # H/I: লুকআপ
    "H1": 1, "H2": 3, "H3": 5, "I1": "a", "I2": "b", "I3": "c",
    # K: ছুটি (২০২৪-০১-০৮ সোম, ২০২৪-০১-০৯ মঙ্গল)
    "K1": 45299, "K2": 45300,
    # L: টেক্সট
    "L1": "Hello-World-Foo", "L2": "a,b,c",
    # M: ফল-টেস্টের জন্য (অনুপস্থিত মান ও টাই)
    **{f"M{i+1}": v for i, v in enumerate([7, 3.5, 3.5, 1, 3.5])},
    # N: ছোট সেট (ধনাত্মক)
    **{f"N{i+1}": v for i, v in enumerate([4, 5, 8, 7, 11, 4, 3])},
    # P: Microsoft PERCENTRANK ডকুমেন্টেশনের ডেটা
    **{f"P{i+1}": v for i, v in enumerate([13, 12, 11, 8, 4, 3, 2, 1, 1, 1])},
}
ERROR_CELLS = {"G2": "=NA()"}

# LibreOffice xlsx-এ এগুলোর _xlfn. উপসর্গ লাগে
XLFN = ["STDEV.S", "STDEV.P", "VAR.S", "VAR.P", "RANK.AVG", "PERCENTRANK.INC",
        "CEILING.MATH", "FLOOR.MATH", "NUMBERVALUE", "ISOWEEKNUM", "TEXTBEFORE", "TEXTAFTER", "XOR", "AGGREGATE"]

# ---- কেস: (ফর্মুলা) --------------------------------------------------------
CASES = [
    # গণিত
    "=SUMSQ(3,4)", "=SUMSQ(A1:A3)", "=SUMSQ(B1:B6)", "=SUMSQ(2,\"3\",TRUE)", "=SUMSQ(\"x\")", "=SUMSQ(G1:G4)",
    "=EVEN(1.5)", "=EVEN(3)", "=EVEN(2)", "=EVEN(-1)", "=EVEN(0)", "=EVEN(2.1)", "=EVEN(-2.5)",
    "=ODD(1.5)", "=ODD(3)", "=ODD(2)", "=ODD(-1)", "=ODD(-2)", "=ODD(0)", "=ODD(2.1)",
    "=QUOTIENT(5,2)", "=QUOTIENT(-7,2)", "=QUOTIENT(4.5,3.1)", "=QUOTIENT(1,0)",
    "=CEILING.MATH(6.3)", "=CEILING.MATH(-5.5,2)", "=CEILING.MATH(-5.5,2,-1)", "=CEILING.MATH(6.3,2)", "=CEILING.MATH(24.3,5)", "=CEILING.MATH(0,5)", "=CEILING.MATH(7,0)",
    "=FLOOR.MATH(6.7)", "=FLOOR.MATH(-5.5,2)", "=FLOOR.MATH(-5.5,2,-1)", "=FLOOR.MATH(6.3,2)", "=FLOOR.MATH(24.3,5)",
    "=COMBIN(8,2)", "=COMBIN(10,3)", "=COMBIN(5,0)", "=COMBIN(5,5)", "=COMBIN(3,5)", "=COMBIN(-1,2)", "=COMBIN(52,5)", "=COMBIN(10.9,3.9)",
    "=PERMUT(100,3)", "=PERMUT(3,2)", "=PERMUT(5,0)", "=PERMUT(2,3)", "=PERMUT(10,10)",
    # পরিসংখ্যান
    "=STDEV.S(A1:A8)", "=STDEV.P(A1:A8)", "=VAR.S(A1:A8)", "=VAR.P(A1:A8)",
    "=STDEV.S(B1:B6)", "=STDEV.S(5)", "=STDEV.P(5)", "=VAR.P(5)", "=VAR.S(1,2,3,4)", "=STDEV.S(A1:A3,10)", "=STDEV.S(G1:G4)", "=STDEV.S(\"x\",1)",
    "=GEOMEAN(4,9)", "=GEOMEAN(A1:A8)", "=GEOMEAN(0,2)", "=GEOMEAN(-1,2)", "=GEOMEAN(N1:N7)",
    "=DEVSQ(A1:A8)", "=DEVSQ(4,5,8,7,11,4,3)", "=DEVSQ(B1:B6)", "=DEVSQ(5)",
    "=RANK.AVG(3.5,M1:M5)", "=RANK.AVG(3.5,M1:M5,1)", "=RANK.AVG(7,M1:M5)", "=RANK.AVG(1,M1:M5)", "=RANK.AVG(99,M1:M5)", "=RANK.AVG(94,A1:A8)", "=RANK.AVG(4,A1:A8)", "=RANK.AVG(4,A1:A8,1)",
    "=PERCENTRANK.INC(A1:A8,5)", "=PERCENTRANK.INC(A1:A8,4)", "=PERCENTRANK.INC(A1:A8,2)", "=PERCENTRANK.INC(A1:A8,9)", "=PERCENTRANK.INC(A1:A8,8)",
    "=PERCENTRANK.INC(A1:A8,5,5)", "=PERCENTRANK.INC(A1:A8,6,4)", "=PERCENTRANK.INC(A1:A8,1)", "=PERCENTRANK.INC(A1:A8,10)", "=PERCENTRANK.INC(A1:A8,5,0)",
    "=PERCENTRANK.INC(C1:C5,2.5)", "=PERCENTRANK.INC(C1:C5,3.3333,2)",
    # টেক্সট (TEXTBEFORE/AFTER ছাড়া)
    "=NUMBERVALUE(\"3.5\",\".\",\",\")", "=NUMBERVALUE(\"2.500,27\",\",\",\".\")", "=NUMBERVALUE(\"3.5%\",\".\",\",\")", "=NUMBERVALUE(\"1,234.56\",\".\",\",\")", "=NUMBERVALUE(\"\",\".\",\",\")", "=NUMBERVALUE(\" 12 34 \",\".\",\",\")", "=NUMBERVALUE(\"abc\",\".\",\",\")", "=NUMBERVALUE(\"9%%\",\".\",\",\")", "=NUMBERVALUE(\"-5\",\".\",\",\")", "=NUMBERVALUE(\"1.2.3\",\".\",\",\")", "=NUMBERVALUE(\"5\",\".\",\".\")",
    "=FIXED(1234.567,1)", "=FIXED(1234.567,-1)", "=FIXED(1234.567,0)", "=FIXED(-1234.567)", "=FIXED(1234.567,1,TRUE)", "=FIXED(0.5,0)", "=FIXED(2.5,0)", "=FIXED(-0.4,0)", "=FIXED(1234567.891,2)", "=FIXED(44.332)",
    "=T(\"hi\")", "=T(5)", "=T(TRUE)", "=T(L1)", "=T(A1)", "=T(G2)",
    # তারিখ-সময়
    "=DATEVALUE(\"2024-03-15\")", "=DATEVALUE(\"2024-1-5\")", "=DATEVALUE(\"March 5, 2024\")", "=DATEVALUE(\"5 March 2024\")", "=DATEVALUE(\"junk\")", "=DATEVALUE(5)", "=DATEVALUE(\"2024-02-30\")",
    "=TIMEVALUE(\"14:30\")", "=TIMEVALUE(\"2:30 PM\")", "=TIMEVALUE(\"12:00 AM\")", "=TIMEVALUE(\"12:00 PM\")", "=TIMEVALUE(\"23:59:59\")", "=TIMEVALUE(\"6:00:00 AM\")", "=TIMEVALUE(\"junk\")", "=TIMEVALUE(\"2024-03-15 18:00\")",
    "=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30))", "=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30),1)", "=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30),2)", "=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30),3)", "=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30),4)",
    "=YEARFRAC(DATE(2024,1,31),DATE(2024,2,29))", "=YEARFRAC(DATE(2023,2,28),DATE(2024,2,29))", "=YEARFRAC(DATE(2020,2,29),DATE(2021,2,28),1)", "=YEARFRAC(DATE(2019,1,1),DATE(2024,6,30),1)", "=YEARFRAC(DATE(2023,3,1),DATE(2024,2,28),1)",
    "=YEARFRAC(DATE(2024,7,30),DATE(2012,1,1))", "=YEARFRAC(DATE(2024,1,1),DATE(2024,1,1))", "=YEARFRAC(DATE(2024,1,1),DATE(2025,1,1),5)", "=YEARFRAC(DATE(2023,12,31),DATE(2024,3,31))", "=YEARFRAC(DATE(2023,12,31),DATE(2024,12,30),1)", "=YEARFRAC(DATE(2023,1,1),DATE(2025,12,31),1)",
    "=DAYS360(DATE(2011,1,30),DATE(2011,2,1))", "=DAYS360(DATE(2011,1,1),DATE(2011,12,31))", "=DAYS360(DATE(2011,1,31),DATE(2011,3,31))", "=DAYS360(DATE(2011,1,31),DATE(2011,3,31),TRUE)", "=DAYS360(DATE(2024,2,29),DATE(2024,3,31))", "=DAYS360(DATE(2024,3,31),DATE(2024,2,1))", "=DAYS360(DATE(2023,2,28),DATE(2023,3,31))", "=DAYS360(DATE(2023,2,28),DATE(2023,2,28))", "=DAYS360(DATE(2024,5,31),DATE(2024,6,30),TRUE)",
    "=ISOWEEKNUM(DATE(2012,3,9))", "=ISOWEEKNUM(DATE(2024,1,1))", "=ISOWEEKNUM(DATE(2021,1,3))", "=ISOWEEKNUM(DATE(2020,12,31))", "=ISOWEEKNUM(DATE(2026,1,1))", "=ISOWEEKNUM(DATE(2018,12,31))", "=ISOWEEKNUM(DATE(2015,12,31))",
    "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,31))", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,31),11)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,31),7)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,31),\"0000011\")", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,31),1,K1:K2)", "=NETWORKDAYS.INTL(DATE(2024,1,31),DATE(2024,1,1))", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),\"1111100\")", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),\"1111111\")", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),99)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),2)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),3)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),17)", "=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),11,DATE(2024,1,7))",
    "=WORKDAY.INTL(DATE(2024,1,1),10)", "=WORKDAY.INTL(DATE(2024,1,1),10,11)", "=WORKDAY.INTL(DATE(2024,1,1),-5)", "=WORKDAY.INTL(DATE(2024,1,1),0)", "=WORKDAY.INTL(DATE(2024,1,5),1,1,K1:K2)", "=WORKDAY.INTL(DATE(2024,1,5),1,\"0000011\")", "=WORKDAY.INTL(DATE(2024,1,5),3,7)", "=WORKDAY.INTL(DATE(2024,1,6),1)", "=WORKDAY.INTL(DATE(2024,1,5),1,\"1111111\")", "=WORKDAY.INTL(DATE(2024,1,8),-1,2)",
    # তথ্য ও লজিক
    "=ISODD(3)", "=ISODD(2)", "=ISODD(-3)", "=ISODD(2.9)", "=ISODD(0)", "=ISODD(\"7\")", "=ISODD(\"x\")", "=ISODD(TRUE)", "=ISODD(A9)", "=ISODD(G2)",
    "=ISEVEN(4)", "=ISEVEN(3)", "=ISEVEN(-2)", "=ISEVEN(0)", "=ISEVEN(2.5)", "=ISEVEN(A9)", "=ISEVEN(\"x\")", "=ISEVEN(TRUE)",
    "=ISLOGICAL(TRUE)", "=ISLOGICAL(1)", "=ISLOGICAL(\"TRUE\")", "=ISLOGICAL(B5)", "=ISLOGICAL(A1>2)", "=ISLOGICAL(G2)", "=ISLOGICAL(A9)",
    "=ISNONTEXT(5)", "=ISNONTEXT(\"a\")", "=ISNONTEXT(A1)", "=ISNONTEXT(B2)", "=ISNONTEXT(A9)", "=ISNONTEXT(G2)", "=ISNONTEXT(TRUE)",
    "=N(5)", "=N(\"a\")", "=N(TRUE)", "=N(FALSE)", "=N(A1)", "=N(B2)", "=N(G2)", "=N(A9)", "=N(-2.5)",
    "=TYPE(5)", "=TYPE(\"a\")", "=TYPE(TRUE)", "=TYPE(G2)", "=TYPE(A1:A3)", "=TYPE(A1)", "=TYPE(B2)", "=TYPE(B5)", "=TYPE(NA())", "=TYPE(1/0)",
    "=NA()", "=ISNA(NA())", "=IFERROR(NA(),\"x\")",
    "=XOR(TRUE,FALSE)", "=XOR(TRUE,TRUE)", "=XOR(TRUE,TRUE,TRUE)", "=XOR(1,0)", "=XOR(B5,FALSE)", "=XOR(\"a\")", "=XOR(B1:B6)", "=XOR(FALSE)", "=XOR(G2,TRUE)", "=XOR(0,0)", "=XOR(5,0,0)",
    # লুকআপ ও রেফারেন্স
    "=LOOKUP(3,H1:H3,I1:I3)", "=LOOKUP(4,H1:H3,I1:I3)", "=LOOKUP(0,H1:H3,I1:I3)", "=LOOKUP(5,H1:H3,I1:I3)", "=LOOKUP(100,H1:H3,I1:I3)", "=LOOKUP(2,H1:H3)", "=LOOKUP(1,H1:H3)", "=LOOKUP(0,H1:H3)", "=LOOKUP(4.9,H1:H3,I1:I3)", "=LOOKUP(G2,H1:H3,I1:I3)",
    "=ADDRESS(2,3)", "=ADDRESS(2,3,1)", "=ADDRESS(2,3,2)", "=ADDRESS(2,3,3)", "=ADDRESS(2,3,4)", "=ADDRESS(1,1)", "=ADDRESS(1,27)", "=ADDRESS(5,52,4)", "=ADDRESS(2,3,1,FALSE)", "=ADDRESS(2,3,2,FALSE)", "=ADDRESS(2,3,3,FALSE)", "=ADDRESS(2,3,4,FALSE)", "=ADDRESS(2,3,1,TRUE,\"Sheet2\")", "=ADDRESS(2,3,1,TRUE,\"My Sheet\")", "=ADDRESS(0,1)", "=ADDRESS(1,0)", "=ADDRESS(1048576,16384)", "=ADDRESS(1048577,1)", "=ADDRESS(1,16385)", "=ADDRESS(1,1,5)",
    "=HYPERLINK(\"http://x.com\",\"Click\")", "=HYPERLINK(\"http://x.com\")", "=HYPERLINK(\"http://x.com\",5)",
    "=AGGREGATE(9,6,A1:A8)", "=AGGREGATE(9,4,A1:A8)", "=AGGREGATE(1,6,G1:G4)", "=AGGREGATE(9,6,G1:G4)", "=AGGREGATE(9,4,G1:G4)", "=AGGREGATE(4,6,G1:G4)", "=AGGREGATE(5,6,G1:G4)", "=AGGREGATE(2,6,G1:G4)", "=AGGREGATE(6,6,A1:A3)", "=AGGREGATE(7,6,A1:A8)", "=AGGREGATE(8,6,A1:A8)", "=AGGREGATE(10,6,A1:A8)", "=AGGREGATE(11,6,A1:A8)", "=AGGREGATE(12,6,A1:A8)", "=AGGREGATE(13,6,A1:A8)", "=AGGREGATE(13,6,C1:C5)",
    "=AGGREGATE(14,6,A1:A8,2)", "=AGGREGATE(15,6,A1:A8,2)", "=AGGREGATE(14,6,A1:A8,9)", "=AGGREGATE(16,6,A1:A8,0.3)", "=AGGREGATE(17,6,A1:A8,1)", "=AGGREGATE(18,6,A1:A8,0.3)", "=AGGREGATE(19,6,A1:A8,1)", "=AGGREGATE(16,6,A1:A8,1.5)", "=AGGREGATE(17,6,A1:A8,5)", "=AGGREGATE(18,6,A1:A8,0.05)", "=AGGREGATE(19,6,A1:A8,0)", "=AGGREGATE(14,6,G1:G4,1)", "=AGGREGATE(14,4,G1:G4,1)", "=AGGREGATE(20,6,A1:A8)", "=AGGREGATE(9,8,A1:A8)", "=AGGREGATE(3,6,G1:G4)", "=AGGREGATE(3,4,G1:G4)", "=AGGREGATE(3,6,B1:B6)", "=AGGREGATE(9,6,A1:A3,A4:A5)", "=AGGREGATE(1,4,B1:B6)",
    # অর্থ
    "=SLN(30000,7500,10)", "=SLN(10,10,5)", "=SLN(100,0,0)", "=SLN(-100,0,4)",
    "=SYD(30000,7500,10,1)", "=SYD(30000,7500,10,10)", "=SYD(30000,7500,10,11)", "=SYD(30000,7500,0,1)", "=SYD(30000,7500,10,0)", "=SYD(100,10,4,2)",
    "=DB(1000000,100000,6,1,7)", "=DB(1000000,100000,6,2,7)", "=DB(1000000,100000,6,3,7)", "=DB(1000000,100000,6,7,7)", "=DB(1000000,100000,6,8,7)", "=DB(1000000,100000,6,1)", "=DB(1000000,100000,6,6)", "=DB(1000000,100000,6,7)", "=DB(0,0,5,1)", "=DB(1000,100,5,0)", "=DB(1000,100,5,1,13)", "=DB(1000,0,5,1)", "=DB(-1,0,5,1)", "=DB(1000,100,0,1)",
    "=DDB(2400,300,10,1)", "=DDB(2400,300,10,2)", "=DDB(2400,300,10,10)", "=DDB(2400,300,10,1,1.5)", "=DDB(2400,300,10,11)", "=DDB(2400,300,10,0)", "=DDB(2400,300,10,5,3)", "=DDB(100,100,5,2)", "=DDB(2400,2000,10,3)",
    "=CUMIPMT(0.09/12,30*12,125000,13,24,0)", "=CUMPRINC(0.09/12,30*12,125000,13,24,0)", "=CUMIPMT(0.09/12,30*12,125000,1,1,0)", "=CUMIPMT(0.09/12,30*12,125000,1,1,1)", "=CUMPRINC(0.09/12,30*12,125000,1,1,1)", "=CUMIPMT(0.09/12,30*12,125000,1,360,1)", "=CUMPRINC(0.09/12,30*12,125000,1,360,0)", "=CUMIPMT(0.09/12,30*12,125000,5,10,1)", "=CUMIPMT(0,360,125000,1,12,0)", "=CUMIPMT(0.01,12,1000,13,14,0)", "=CUMIPMT(0.01,12,1000,2,1,0)", "=CUMIPMT(0.01,12,-1000,1,2,0)", "=CUMIPMT(0.01,12,1000,1,2,2)", "=CUMIPMT(0.01,12,1000,0,2,0)", "=CUMPRINC(0.01,12,1000,2,12,0)",
    "=EFFECT(0.0525,4)", "=EFFECT(0.1,1)", "=EFFECT(0.1,12)", "=EFFECT(0,4)", "=EFFECT(0.1,0)", "=EFFECT(0.1,2.9)", "=EFFECT(-0.1,2)",
    "=NOMINAL(0.053543,4)", "=NOMINAL(0.1,1)", "=NOMINAL(0.1,12)", "=NOMINAL(0,4)", "=NOMINAL(0.1,0)", "=NOMINAL(0.1,2.9)",
    "=MIRR(E1:E6,0.1,0.12)", "=MIRR(E1:E5,0.1,0.12)", "=MIRR(E1:E6,0.12,0.1)", "=MIRR(C1:C5,0.1,0.1)", "=MIRR(E1:E2,0.1,0.1)", "=MIRR(E1:E6,-1,0.1)", "=MIRR(B1:B6,0.1,0.1)",
]

# ---- LibreOffice-এ নেই, Microsoft ডকুমেন্টেশন থেকে হাতে-দেওয়া প্রত্যাশিত ----
MANUAL = {
    # Microsoft PERCENTRANK.INC ডক-উদাহরণ (P1:P10 = 13,12,11,8,4,3,2,1,1,1)
    '=PERCENTRANK.INC(P1:P10,2)': 0.333,
    '=PERCENTRANK.INC(P1:P10,4)': 0.555,
    '=PERCENTRANK.INC(P1:P10,8)': 0.666,
    '=PERCENTRANK.INC(P1:P10,5)': 0.583,
    # Microsoft ডক-উদাহরণ (দশমিক নির্দিষ্ট সংখ্যা পর্যন্ত মেলে)
    '=ROUND(CUMIPMT(0.09/12,30*12,125000,13,24,0),2)': -11135.23,
    '=ROUND(CUMPRINC(0.09/12,30*12,125000,13,24,0),4)': -934.1071,
    '=ROUND(EFFECT(0.0525,4),6)': 0.053543,
    '=ROUND(NOMINAL(0.053543,4),6)': 0.0525,
    '=ROUND(MIRR(E1:E6,0.1,0.12),6)': 0.126094,
    '=ROUND(DB(1000000,100000,6,1,7),2)': 186083.33,
    '=ROUND(DB(1000000,100000,6,2,7),2)': 259639.42,
    '=ROUND(DB(1000000,100000,6,3,7),2)': 176814.44,
    '=ROUND(DB(1000000,100000,6,4,7),2)': 120410.64,
    '=ROUND(DB(1000000,100000,6,5,7),2)': 81999.64,
    '=ROUND(DB(1000000,100000,6,6,7),2)': 55841.76,
    '=ROUND(DB(1000000,100000,6,7,7),2)': 15845.10,
    '=SLN(30000,7500,10)': 2250,
    '=ROUND(SYD(30000,7500,10,1),2)': 4090.91,
    '=ROUND(DDB(2400,300,10,1,2),2)': 480,
    '=ROUND(DDB(2400,300,10,2,2),2)': 384,
    '=ROUND(DDB(2400,300,10,10),2)': 22.12,
    '=YEARFRAC(DATE(2012,1,1),DATE(2012,7,30))': 0.58055555555556,
    '=DAYS360(DATE(2011,1,30),DATE(2011,2,1))': 1,
    '=ISOWEEKNUM(DATE(2012,3,9))': 10,
    '=COMBIN(8,2)': 28,
    '=PERMUT(100,3)': 970200,
    '=CEILING.MATH(24.3,5)': 25,
    '=FLOOR.MATH(-5.5,2)': -6,
    '=FLOOR.MATH(-5.5,2,-1)': -4,
    '=STDEV.S(A1:A8)': 2.138089935299395,
    '=GEOMEAN(4,5,8,7,11,4,3)': 5.476987,
    '=TEXTBEFORE("Red riding hood\'s red hood","red")': "Red riding hood's ",
    '=TEXTBEFORE("Red riding hood\'s red hood","red",2)': "#N/A",
    '=TEXTBEFORE("Red riding hood\'s red hood","red",1,1)': "",
    '=TEXTBEFORE("Red riding hood\'s red hood","red",-1,1)': "Red riding hood's ",
    '=TEXTBEFORE("Red riding hood\'s red hood","red",1,0)': "Red riding hood's ",
    '=TEXTBEFORE("Red riding hood","hood",1,1,1,"none")': "Red riding ",
    '=TEXTBEFORE("a-b-c","-")': "a",
    '=TEXTBEFORE("a-b-c","-",2)': "a-b",
    '=TEXTBEFORE("a-b-c","-",-1)': "a-b",
    '=TEXTBEFORE("a-b-c","-",-2)': "a",
    '=TEXTBEFORE("a-b-c","-",3)': "#N/A",
    '=TEXTBEFORE("a-b-c","-",3,0,1)': "a-b-c",
    '=TEXTBEFORE("a-b-c","-",-3,0,1)': "",
    '=TEXTBEFORE("a-b-c","-",0)': "#VALUE!",
    '=TEXTBEFORE("a-b-c","-",99)': "#VALUE!",
    '=TEXTBEFORE("a-b-c","x")': "#N/A",
    '=TEXTBEFORE("a-b-c","x",1,0,0,"nf")': "nf",
    '=TEXTBEFORE("abc","")': "",
    '=TEXTBEFORE("ABC-def","c",1,1)': "AB",
    '=TEXTBEFORE("ABC-def","c")': "#N/A",
    '=TEXTBEFORE(L1,"-")': "Hello",
    '=TEXTBEFORE("a-b","-",1,2)': "#VALUE!",
    '=TEXTAFTER("Red riding hood\'s red hood","red")': " hood",
    '=TEXTAFTER("Red riding hood\'s red hood","red",2)': "#N/A",
    '=TEXTAFTER("Red riding hood\'s red hood","red",1,1)': " riding hood's red hood",
    '=TEXTAFTER("Red riding hood\'s red hood","red",-1,1)': " hood",
    '=TEXTAFTER("a-b-c","-")': "b-c",
    '=TEXTAFTER("a-b-c","-",2)': "c",
    '=TEXTAFTER("a-b-c","-",-1)': "c",
    '=TEXTAFTER("a-b-c","-",-2)': "b-c",
    '=TEXTAFTER("a-b-c","-",3)': "#N/A",
    '=TEXTAFTER("a-b-c","-",3,0,1)': "",
    '=TEXTAFTER("a-b-c","-",-3,0,1)': "a-b-c",
    '=TEXTAFTER("a-b-c","-",0)': "#VALUE!",
    '=TEXTAFTER("a-b-c","x")': "#N/A",
    '=TEXTAFTER("a-b-c","x",1,0,0,"nf")': "nf",
    '=TEXTAFTER("abc","")': "abc",
    '=TEXTAFTER(L1,"-",-1)': "Foo",
    '=TEXTAFTER(L2,",")': "b,c",
    '=TEXTAFTER("ABC-def","C",1,1)': "-def",
}

# LibreOffice ও Excel যেখানে আলাদা, সেখানে Microsoft ডকুমেন্টেশনের আচরণই সঠিক ধরা হয়।
# প্রতিটির কারণ লেখা আছে; টেস্ট এই মান ব্যবহার করে।
OVERRIDES = {
    '=SUMSQ(B1:B6)': (1400, "Excel: রেফারেন্সের বুলিয়ান উপেক্ষিত; LibreOffice TRUE=1 ধরে"),
    '=SUMSQ(2,"3",TRUE)': (14, "Excel: সরাসরি আর্গুমেন্টে সংখ্যা-টেক্সট ও বুলিয়ান গণ্য"),
    '=STDEV.S(B1:B6)': (10, "রেফারেন্সের বুলিয়ান উপেক্ষিত (10,20,30)"),
    '=DEVSQ(B1:B6)': (200, "রেফারেন্সের বুলিয়ান উপেক্ষিত (10,20,30)"),
    '=GEOMEAN(0,2)': ("#NUM!", "Excel: ০ থাকলে #NUM!; LibreOffice ০ দেয়"),
    '=PERCENTRANK.INC(A1:A8,4)': (0.142, "Excel ছেঁটে ফেলে (truncate), LibreOffice রাউন্ড করে"),
    '=PERCENTRANK.INC(A1:A8,8)': (0.928, "Excel ছেঁটে ফেলে (truncate)"),
    '=PERCENTRANK.INC(A1:A8,5,5)': (0.57142, "Excel ছেঁটে ফেলে (truncate)"),
    '=PERCENTRANK.INC(A1:A8,1)': ("#N/A", "Excel: পরিসরের বাইরে → #N/A"),
    '=PERCENTRANK.INC(A1:A8,10)': ("#N/A", "Excel: পরিসরের বাইরে → #N/A"),
    '=DATEVALUE("5 March 2024")': (45356, "LibreOffice locale-নির্ভর; Excel ইংরেজি মাসের নাম বোঝে"),
    '=DATEVALUE("2024-02-30")': ("#VALUE!", "অবৈধ তারিখ গড়িয়ে যাবে না"),
    '=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),99)': ("#NUM!", "Excel ডক: অবৈধ weekend সংখ্যা → #NUM!"),
    '=ISODD(TRUE)': ("#VALUE!", "Excel ডক: অ-সংখ্যা (বুলিয়ান) → #VALUE!"),
    '=ISEVEN(TRUE)': ("#VALUE!", "Excel ডক: অ-সংখ্যা (বুলিয়ান) → #VALUE!"),
    '=ISODD("7")': (True, "সংখ্যা-টেক্সট সংখ্যা হিসেবে গণ্য"),
    '=ISODD(A9)': (False, "ফাঁকা সেল = ০ (জোড়)"),
    '=ISEVEN(A9)': (True, "ফাঁকা সেল = ০ (জোড়)"),
    '=TYPE(TRUE)': (4, "Excel: লজিক্যাল = ৪"),
    '=TYPE(A1:A3)': (64, "Excel: অ্যারে = ৬৪"),
    '=TYPE(B5)': (4, "Excel: লজিক্যাল = ৪"),
    '=ADDRESS(1,1,5)': ("#VALUE!", "Excel ডক: abs_num ১–৪ ছাড়া #VALUE!"),
    '=SYD(30000,7500,10,11)': ("#NUM!", "Excel ডক: per > life → #NUM!"),
    '=SYD(30000,7500,10,0)': ("#NUM!", "Excel ডক: per < 1 → #NUM!"),
    '=DB(1000000,100000,6,7)': ("#NUM!", "month=12 হলে period > life → #NUM!"),
    '=EFFECT(0,4)': ("#NUM!", "Excel ডক: nominal_rate ≤ 0 → #NUM!"),
    '=MIRR(E1:E6,-1,0.1)': ("#NUM!", "finance_rate = -1 অবৈধ"),
    '=YEARFRAC(DATE(2024,1,1),DATE(2025,1,1),5)': ("#NUM!", "অবৈধ basis"),
    '=NUMBERVALUE("",".",",")': (0, "Excel ডক: ফাঁকা টেক্সট → ০"),
    '=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,1,7),"1111111")': ("#VALUE!", "Excel ডক: সবগুলো ১ (সব দিন ছুটি) → #VALUE!"),
    '=AGGREGATE(13,6,C1:C5)': ("#N/A", "MODE: পুনরাবৃত্তি নেই → #N/A"),
    '=AGGREGATE(14,6,A1:A8,9)': ("#NUM!", "LARGE: k > সংখ্যা → #NUM!"),
    '=AGGREGATE(1,4,B1:B6)': (20, "রেফারেন্সের বুলিয়ান উপেক্ষিত (10,20,30)"),
}

def build(out_xlsx):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    for k, v in DATA.items():
        ws[k] = v
    for k, v in ERROR_CELLS.items():
        ws[k] = v
    for i, f in enumerate(CASES, start=1):
        g = f
        for name in XLFN:
            g = g.replace(name + "(", "_xlfn." + name + "(")
        c = ws.cell(row=i, column=20, value=g)  # কলাম T
        c.number_format = "0.################"
    wb.save(out_xlsx)

def run_lo(xlsx, outdir):
    # token 8 = false → কোষের মান "যেমন দেখায়" নয়, কাঁচা মান
    filt = 'csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,false,false,false,false,-1'
    subprocess.run(["soffice", "--headless", "--convert-to", filt, "--outdir", outdir, xlsx],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    base = os.path.splitext(os.path.basename(xlsx))[0]
    cands = [f for f in os.listdir(outdir) if f.startswith(base) and f.endswith(".csv")]
    return os.path.join(outdir, sorted(cands)[0])

def main():
    tmp = tempfile.mkdtemp()
    x = os.path.join(tmp, "cases.xlsx")
    build(x)
    csv_path = run_lo(x, tmp)
    rows = list(csv.reader(open(csv_path, encoding="utf-8")))
    results = []
    for i, f in enumerate(CASES):
        val = rows[i][19] if i < len(rows) and len(rows[i]) > 19 else None
        results.append({"formula": f, "lo": val})
    out = {
        "libreoffice": subprocess.run(["soffice", "--version"], capture_output=True, text=True).stdout.strip(),
        "data": DATA,
        "errorCells": list(ERROR_CELLS),
        "cases": results,
        "manual": [{"formula": k, "expected": v} for k, v in MANUAL.items()],
        "overrides": [{"formula": k, "expected": v[0], "reason": v[1]} for k, v in OVERRIDES.items()],
    }
    path = os.path.join(HERE, "batch1.oracle.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"cases={len(results)} manual={len(MANUAL)} -> {path}")
    empty = [r for r in results if r["lo"] in (None, "")]
    print("empty LO results:", len(empty))

if __name__ == "__main__":
    main()
