import ExcelJS from "exceljs";
import AppError from "../../common/errors/AppError.js";
import prisma from "../../config/prisma.js";
import { resolveBranchId } from "./branchAttendanceReports.repository.js";
import { getCompletedCourseAcademicTests } from "../branchStudents/branchStudents.service.js";
import { COMPLETED_STUDENT_COLUMNS } from "./completedStudentReportColumns.js";
const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const COLORS = { completed: "FFC6EFCE", studying: "FFBDD7EE", discontinued: "FFFFC7CE", new: "FFFCE4D6" }; const MULTI_COURSE_COLOR = "FFE2F0D9";
const COLUMNS = [...COMPLETED_STUDENT_COLUMNS, ["paidAmount", "Paid Amount"], ["pendingAmount", "Pending Amount"]];
const display = (value) => value === null || value === undefined || (typeof value === "string" && !value.trim()) ? "-" : String(value).trim();
const dateKey = (value) => { if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10); const raw = String(value || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ""; };
const inRange = (value, fromDate, toDate) => { const key = dateKey(value); return Boolean(key && key >= fromDate && key <= toDate); };
const dateDisplay = (value) => { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? display(value) : date.toLocaleDateString("en-GB", { timeZone: "Asia/Calcutta" }); }; const scheduleModeDisplay = (schedule, mode) => { const values = [schedule, mode].map((value) => String(value || "").trim()).filter((value) => value && value !== "-"); return values.length ? [...new Set(values)].join(" / ") : "-"; };
function indiaDateKey(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value).map(({ type, value: partValue }) => [type, partValue]))
  return [parts.year, parts.month, parts.day].join("-")
}
export function resolveReportPeriod(query = {}, now = new Date()) {
  const mode = String(query.mode || "month").toLowerCase()
  let fromDate = String(query.fromDate || "").slice(0, 10)
  let toDate = String(query.toDate || "").slice(0, 10)
  if (mode === "month") {
    const year = Number(query.year)
    const month = Number(query.month)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new AppError("A valid month and year are required", 400)
    fromDate = year + "-" + String(month).padStart(2, "0") + "-01"
    toDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  } else if (mode === "year") {
    const year = Number(query.year)
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new AppError("A valid year is required", 400)
    fromDate = year + "-01-01"
    toDate = year + "-12-31"
  } else if (mode === "all") {
    fromDate = ""
    toDate = ""
  } else if (mode === "week") {
    toDate = indiaDateKey(now)
    const sunday = new Date(toDate + "T00:00:00.000Z")
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
    fromDate = sunday.toISOString().slice(0, 10)
  } else if (mode !== "range") {
    throw new AppError("Invalid report period", 400)
  }
  if (mode !== "all" && (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate))) throw new AppError("Valid fromDate and toDate are required", 400)
  if (fromDate && toDate && fromDate > toDate) throw new AppError("From Date cannot be later than To Date", 400)
  return { mode, fromDate, toDate }
}
function lifecycleOf(student,courseStudent){const approved=(student.discontinuationRequests||[]).filter((event)=>(!event.courseId||String(event.courseId)===String(courseStudent.courseId))&&String(event.status||"").toUpperCase()==="APPROVED");const discontinued=approved.sort((a,b)=>String(b.branchReviewedAt||b.superAdminReviewedAt||b.createdAt||"").localeCompare(String(a.branchReviewedAt||a.superAdminReviewedAt||a.createdAt||"")))[0];if(discontinued)return {studentStatus:"Discontinued Student",rowStatusKey:"discontinued",statusDate:discontinued.branchReviewedAt||discontinued.superAdminReviewedAt||discontinued.createdAt,discontinuationReason:discontinued.reason||discontinued.details||"-"};if(courseStudent.courseCompletedAt)return {studentStatus:"Completed Student",rowStatusKey:"completed",statusDate:courseStudent.courseCompletedAt,discontinuationReason:"-"};return {studentStatus:"Currently Studying / In Progress",rowStatusKey:"studying",statusDate:"",discontinuationReason:"-"};}
export function courseOverlapsReportPeriod(courseStartDate, courseEndDate, admissionDate, fromDate, toDate) {
  const start = dateKey(courseStartDate) || dateKey(admissionDate)
  const end = dateKey(courseEndDate)
  return (!start || start <= toDate) && (!end || end >= fromDate)
}
export function hasPeriodActivity(student, courseStudent, lifecycle, fromDate, toDate) {
  if (lifecycle.rowStatusKey !== "studying" && inRange(lifecycle.statusDate, fromDate, toDate)) return true
  const courseId = String(courseStudent.courseId || student.courseId || "")
  const primaryCourse = courseId === String(student.courseId || "")
  const belongsToCourse = (item) => item.courseId ? String(item.courseId) === courseId : primaryCourse
  const enrollmentDate = dateKey(courseStudent.courseStartDate) || dateKey(courseStudent.admissionDate)
  if (enrollmentDate && inRange(enrollmentDate, fromDate, toDate)) return true
  if ((student.payments || []).some((item) => belongsToCourse(item) && inRange(item.paymentDate, fromDate, toDate))) return true
  if ((student.installments || []).some((item) => belongsToCourse(item) && inRange(item.dueDate || item.date || item.expectedDate, fromDate, toDate))) return true
  if ((student.calendarAttendanceRecords || []).some((item) => (!item.courseId || String(item.courseId) === courseId) && inRange(item.attendanceDate, fromDate, toDate))) return true
  const evaluationKey = courseId + ":" + String(courseStudent.batchId || student.batchId || "")
  if ((student.academicTestsByCourse?.[evaluationKey] || []).some((item) => inRange(item.submission?.submittedAt, fromDate, toDate))) return true
  const project = student.academicProjectsByCourse?.[evaluationKey]
  return Boolean(project?.submission?.submittedAt && inRange(project.submission.submittedAt, fromDate, toDate))
}
function lifecycleMatches(lifecycle, requestedStatus, mode, fromDate, toDate, courseStartDate, courseEndDate, admissionDate) {
  if (!["completed", "discontinued", "all"].includes(requestedStatus)) throw new AppError("Invalid student status filter", 400)
  if (requestedStatus !== "all" && !["completed", "discontinued"].includes(lifecycle.rowStatusKey)) return false
  if (requestedStatus !== "all" && requestedStatus !== lifecycle.rowStatusKey) return false
  if (mode === "all") return true
  if (lifecycle.rowStatusKey === "studying") {
    return courseOverlapsReportPeriod(courseStartDate, courseEndDate, admissionDate, fromDate, toDate)
  }
  return inRange(lifecycle.statusDate, fromDate, toDate)
}
function academicValue(entry,completed=false){const submission=entry?.submission;if(!entry)return "-";if(!submission)return completed?"-":"Upcoming";const status=String(submission.status||"").toUpperCase(),rawPercentage=submission.percentage,percentage=Number(rawPercentage),obtained=Number(submission.obtainedMarks||0),hasResult=Boolean(submission.submittedAt)||["EVALUATED","SUBMITTED"].includes(status)||(!["NOT_STARTED","NOT_ATTENDED","PENDING"].includes(status)&&rawPercentage!==null&&rawPercentage!==undefined&&Number.isFinite(percentage))||obtained>0;if(["NOT_STARTED","NOT_ATTENDED","PENDING"].includes(status)&&!hasResult)return completed?"-":"Upcoming";if(Number.isFinite(percentage))return `${Math.round(percentage)}%`;const total=Number(submission.totalMarks||0);return total>0?`${Math.round((obtained/total)*100)}%`:completed?"-":"Upcoming";}
function projectValue(entry,completed=false){const submission=entry?.submission;if(!entry)return "-";if(!submission||submission.marksAwarded===null||submission.marksAwarded===undefined)return completed?"-":"Upcoming";const marks=Number(submission.marksAwarded),total=Number(entry.totalMarks||0);return total>0?`${Math.round((marks/total)*100)}%`:String(marks);}
function paymentNumberOf(payment) {
  const explicit = Number(payment.installmentNumber || payment.number || payment.paymentInstallmentNumber)
  const label = String(payment.payAgainst || payment.description || '').match(/installment\s*(\d+)/i)?.[1]
  return explicit > 0 ? explicit : Number(label || 0)
}
function installmentHasPayment(installment, payments, number, allowAggregateFallback = true) {
  return (allowAggregateFallback && Number(installment?.amountPaid || 0) > 0) || (payments || []).some((payment) => {
    const paymentNumber = paymentNumberOf(payment)
    return number === 1 ? paymentNumber === number || paymentNumber === 0 : paymentNumber === number
  })
}
function paymentsForInstallment(payments, number) {
  return (payments || []).filter((payment) => {
    const paymentNumber = paymentNumberOf(payment)
    return number === 1 ? paymentNumber === number || paymentNumber === 0 : paymentNumber === number
  })
}
export function filterPaymentsForReportPeriod(payments, fromDate, toDate) {
  return (payments || []).filter((payment) => !fromDate || inRange(payment.paymentDate, fromDate, toDate))
}
function emptyInstallmentCell() { return { paidAmount: '-', pendingAmount: '-', paymentDate: '-', mode: '-', receiptNumber: '-' } }
function installmentCell(installment, periodPayments, asOfPayments, number, hidePending = false, isPeriodReport = false) {
  const targetPayments = paymentsForInstallment(periodPayments, number)
  const asOfTargetPayments = paymentsForInstallment(asOfPayments, number)
  if (!installment && !targetPayments.length) return emptyInstallmentCell()
  const latestPayment = targetPayments[targetPayments.length - 1]
  const periodPaid = targetPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const historicalAggregate = Number(installment?.amountPaid || 0)
  const paidAmount = isPeriodReport ? periodPaid : (periodPaid || historicalAggregate)
  const paidAsOfDate = asOfTargetPayments.length
    ? asOfTargetPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : isPeriodReport ? 0 : historicalAggregate
  const pendingAmount = hidePending ? '-' : Math.max(Number(installment?.amount || 0) - paidAsOfDate, 0)
  return {
    paidAmount: paidAmount || 0,
    pendingAmount,
    paymentDate: latestPayment ? dateDisplay(latestPayment.paymentDate) : '-',
    mode: latestPayment ? display(latestPayment.paymentMode) : '-',
    receiptNumber: latestPayment ? display(latestPayment.receiptNumber) : '-',
  }
}
function buildRow(student, fromDate, toDate, adminName, lifecycle) {
  const isPrimaryCourse = String(student.courseId || '') === String(student.primaryCourseId || '')
  const scopedPayments = (student.payments || []).filter((item) => item.courseId ? String(item.courseId) === String(student.courseId) : isPrimaryCourse)
  const scopedInstallments = (student.installments || []).filter((item) => item.courseId ? String(item.courseId) === String(student.courseId) : isPrimaryCourse)
  const isPeriodReport = Boolean(fromDate && toDate)
  const payments = filterPaymentsForReportPeriod(scopedPayments, fromDate, toDate)
  const paymentsAsOfPeriodEnd = scopedPayments.filter((item) => !toDate || (dateKey(item.paymentDate) && dateKey(item.paymentDate) <= toDate))
  const paidAmount = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalFees = Number(student.courseAmount || 0)
  const installments = [...scopedInstallments].sort((a, b) => Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0))
  const hideDiscontinuedPending = lifecycle.rowStatusKey === 'discontinued'
  const expectedCollection = hideDiscontinuedPending
    ? 0
    : scopedInstallments
      .filter((item) => !fromDate || inRange(item.dueDate || item.date || item.expectedDate, fromDate, toDate))
      .reduce((sum, item) => sum + Number(item.amount || item.installmentAmount || item.value || 0), 0)
  const paymentDetails = payments
  const visibleInstallments = hideDiscontinuedPending
    ? installments.filter((item) => installmentHasPayment(item, paymentDetails, Number(item.installmentNumber || 0), !isPeriodReport))
    : installments
  const installmentCells = Object.fromEntries(visibleInstallments.map((item) => {
    const number = Number(item.installmentNumber || 0)
    return [number, installmentCell(item, paymentDetails, paymentsAsOfPeriodEnd, number, hideDiscontinuedPending, isPeriodReport)]
  }))
  const attendanceRows = (student.calendarAttendanceRecords || []).filter((item) => !student.courseId || !item.courseId || String(item.courseId) === String(student.courseId))
  const present = attendanceRows.filter((item) => String(item.status).toUpperCase() === 'PRESENT').length
  const academicTests = (student.academicTests || []).filter((item) => !fromDate || inRange(item.submission?.submittedAt, fromDate, toDate))
  const academicProject = !fromDate || (student.academicProject?.submission?.submittedAt && inRange(student.academicProject.submission.submittedAt, fromDate, toDate)) ? student.academicProject : null
  const row = {
    rowStatusKey: lifecycle.rowStatusKey,
    studentId: display(student.studentId), studentName: display(student.studentName), contactNumber: display(student.mobileNumber), emailId: display(student.emailAddress), parentGuardian: display(student.parentGuardian || student.parentName || student.guardianName), parentSpouseNumber: display(student.parentSpouseNumber), qualification: display(student.qualification), educationLevel: display(student.educationLevel), educationStatus: display(student.educationStatus), passedOutYear: display(student.passedOutYear), currentStatus: display(student.currentStatus), designation: display(student.designation), companyName: display(student.companyName), purpose: display(student.purpose), linkedInUrl: display(student.linkedInUrl || student.linkedinUrl), course: display(student.courseName), batchName: display(student.batchName), databaseSource: display(student.source), branchAdminName: display(adminName), courseStartingDate: dateDisplay(student.courseStartDate), courseEndingDate: dateDisplay(student.courseEndDate), scheduleMode: scheduleModeDisplay(student.classSchedule, student.courseMode), batchTiming: display(student.batchTiming), facultyName: display(student.facultyName), attendance: attendanceRows.length ? Math.round(present / attendanceRows.length * 100) + '%' : '-', courseFees: totalFees || 0, registrationFees: student.registrationFees ?? '-', totalFees: totalFees || 0,
    installment1: installmentCells[1] || emptyInstallmentCell(), installment2: installmentCells[2] || emptyInstallmentCell(), installment3: installmentCells[3] || emptyInstallmentCell(),
    paidAmount: paidAmount || 0,
    pendingAmount: hideDiscontinuedPending ? '-' : expectedCollection,
    studentStatus: lifecycle.studentStatus, remarks: display(student.remarks), academicProject: projectValue(academicProject, lifecycle.rowStatusKey === 'completed'), placement: lifecycle.rowStatusKey === 'completed' ? 'Pending' : 'Upcoming', certificationStatus: lifecycle.rowStatusKey === 'completed' ? 'Pending' : 'Upcoming', certificateIssuedDate: lifecycle.rowStatusKey === 'completed' ? 'Pending' : 'Upcoming',
  }
  row.__expectedCollection = expectedCollection
  row.__actualCollection = paymentDetails.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  row.__installmentCount = hideDiscontinuedPending ? Math.max(0, ...visibleInstallments.map((item) => Number(item.installmentNumber || 0))) : installments.length
  for (let number = 1; number <= row.__installmentCount; number += 1) row['installment' + number] = installmentCells[number] || emptyInstallmentCell()
  const nums = academicTests.map((item) => Number(item.testNumber)).filter(Number.isInteger)
  row.__assessmentCount = nums.length ? Math.max(...nums) : 0
  for (let number = 1; number <= row.__assessmentCount; number += 1) row['assessment' + String(number).padStart(2, '0')] = academicValue(academicTests.find((item) => Number(item.testNumber) === number), lifecycle.rowStatusKey === 'completed')
  return row
}
async function attachAcademicTests(students) {
  await Promise.all(students.map(async (student) => {
    const enrollments = (student.courseEnrollments || []).filter((item) => item.courseId);
    const primary = student.courseId
      ? { courseId: student.courseId, batchId: student.batchId }
      : null;
    const allEnrollments = [...enrollments];
    if (primary && !allEnrollments.some((item) => String(item.courseId) === String(primary.courseId))) {
      allEnrollments.unshift(primary);
    }

    const testsByCourse = {};
    const projectsByCourse = {};
    await Promise.all(allEnrollments.map(async (enrollment) => {
      const courseId = enrollment.courseId || student.courseId;
      const batchId = enrollment.batchId || student.batchId;
      if (!courseId || !batchId) return;

      const evaluations = await getCompletedCourseAcademicTests(student, {
        ...enrollment,
        courseId,
        batchId,
      });
      const key = String(courseId) + ":" + String(batchId);
      evaluations.forEach((evaluation) => {
        const type = String(evaluation.testType || "TEST").toUpperCase();
        const testNumber = Number(evaluation.testNumber);
        const submission = {
          status: evaluation.status || "NOT_STARTED",
          percentage: evaluation.percentage,
          obtainedMarks: evaluation.obtainedMarks,
          totalMarks: evaluation.totalMarks,
          submittedAt: evaluation.submittedAt,
        };

        if (["TEST", "TEST_AND_PROJECT"].includes(type) && Number.isInteger(testNumber)) {
          const entries = testsByCourse[key] || (testsByCourse[key] = []);
          const existing = entries.find((entry) => entry.testNumber === testNumber);
          if (!existing || (!existing.submission.submittedAt && submission.submittedAt)) {
            if (existing) existing.submission = submission;
            else entries.push({ testNumber, submission });
          }
        }

        if (["PROJECT", "TEST_AND_PROJECT"].includes(type)) {
          const project = {
            submission: evaluation.marksAwarded == null
              ? null
              : { marksAwarded: evaluation.marksAwarded, submittedAt: evaluation.submittedAt },
            totalMarks: evaluation.projectTotalMarks,
          };
          const existing = projectsByCourse[key];
          if (!existing || (!existing.submission && project.submission)) {
            projectsByCourse[key] = project;
          }
        }
      });
    }));

    student.academicTestsByCourse = testsByCourse;
    student.academicProjectsByCourse = projectsByCourse;
  }));
}
function courseViews(student){const enrollments=(student.courseEnrollments||[]).filter((item)=>item.courseId), primary=student.courseId?{courseId:student.courseId,courseName:student.courseName,batchId:student.batchId,batchName:student.batchName,batchTiming:student.batchTiming,facultyName:student.facultyName,scheduleType:student.classSchedule,mode:student.courseMode,startDate:student.courseStartDate,endDate:student.courseEndDate,courseProgress:student.courseProgress,courseCompletedAt:student.courseCompletedAt,totalCourseAmount:student.courseAmount,finalCourseAmount:student.courseAmount,registrationFees:student.course?.registrationFees??student.registrationFees}:null, all=[...enrollments];if(primary&&!all.some((item)=>String(item.courseId)===String(primary.courseId)))all.unshift(primary);return (all.length?all:[primary||{}]).map((enrollment)=>({...student,primaryCourseId:student.courseId,courseId:enrollment.courseId||student.courseId,courseName:enrollment.courseName||student.courseName,batchId:enrollment.batchId||student.batchId,batchName:enrollment.batchName||student.batchName,batchTiming:enrollment.batchTiming||student.batchTiming,facultyName:enrollment.facultyName||student.facultyName,classSchedule:enrollment.scheduleType||student.classSchedule,courseMode:enrollment.mode||student.courseMode,arrangementType:enrollment.arrangementType||student.arrangementType,courseStartDate:String(enrollment.courseId||student.courseId)===String(student.courseId)?(enrollment.startDate||student.courseStartDate):enrollment.startDate,courseEndDate:String(enrollment.courseId||student.courseId)===String(student.courseId)?(enrollment.endDate||student.courseEndDate):enrollment.endDate,courseProgress:String(enrollment.courseId||student.courseId)===String(student.courseId)?(enrollment.courseProgress??student.courseProgress):(enrollment.courseProgress??0),courseCompletedAt:String(enrollment.courseId||student.courseId)===String(student.courseId)?(enrollment.courseCompletedAt||student.courseCompletedAt):enrollment.courseCompletedAt,courseAmount:enrollment.finalCourseAmount??enrollment.totalCourseAmount??student.courseAmount,registrationFees:enrollment.course?.registrationFees??student.registrationFees,academicTests:(student.academicTestsByCourse||{})[`${enrollment.courseId||student.courseId}:${enrollment.batchId||student.batchId}`]||[],academicProject:(student.academicProjectsByCourse||{})[`${enrollment.courseId||student.courseId}:${enrollment.batchId||student.batchId}`]||null}));}
function reportColumns(rows){const assessmentCount=Math.max(3,...rows.map((row)=>Number(row.__assessmentCount||0))),installmentCount=Math.max(3,...rows.map((row)=>Number(row.__installmentCount||0))),assessments=Array.from({length:assessmentCount},(_,i)=>{const n=i+1,s=String(n).padStart(2,"0");return ["assessment"+s,"Assessment-"+s];}),installments=Array.from({length:installmentCount},(_,i)=>{const n=i+1;return ["installment"+n,n===1?"Installment / Full Payment":"Installment "+n];}),columns=COLUMNS.filter(([key])=>key!=="academicProject"&&!/^installment[1-9]\d*$/.test(key));columns.splice(columns.findIndex(([key])=>key==="paidAmount"),0,...installments);columns.splice(columns.findIndex(([key])=>key==="remarks")+1,0,...assessments,["academicProject","Academic Project"]);return columns;}
function expandColumns(columns){return columns.flatMap(([key,header])=>/^installment\d+$/.test(key)?[[key+".paidAmount","Paid Amount",key,header],[key+".pendingAmount","Pending Amount",key,header],[key+".paymentDate","Payment Date",key,header],[key+".mode","Mode of Collection",key,header],[key+".receiptNumber","Receipt Number",key,header]]:[[key,header,"",""]]);}
function reportCell(row,column){if(column[2])return row[column[2]]?.[column[0].split(".")[1]]??"-";return row[column[0]]??"-";}
function headerStyle(cell){cell.font={bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1F4E78"}};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border={top:{style:"medium",color:{argb:"FFFFFFFF"}},bottom:{style:"medium",color:{argb:"FFFFFFFF"}},left:{style:"medium",color:{argb:"FFFFFFFF"}},right:{style:"medium",color:{argb:"FFFFFFFF"}}};}
function style(cell,color){cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};cell.font={color:{argb:"FF000000"}};cell.alignment={vertical:"middle",wrapText:true,...(cell.value==="-"?{horizontal:"center"}:{})};cell.border={top:{style:"thin",color:{argb:"FF000000"}},bottom:{style:"thin",color:{argb:"FF000000"}},left:{style:"thin",color:{argb:"FF000000"}},right:{style:"thin",color:{argb:"FF000000"}}};}
async function generateBranchMonthlyReport(query,user){const {mode,fromDate,toDate}=resolveReportPeriod(query),requestedStatus=String(query.status||"completed").toLowerCase(),isMonthlyPeriod=String(query.includeCollectionSummary||"").toLowerCase()==="true"&&Boolean(fromDate&&toDate);if(!["completed","discontinued","all"].includes(requestedStatus))throw new AppError("Invalid student status filter",400);const branchId=await resolveBranchId(user,query.branchId),attendanceWhere=fromDate&&toDate?{attendanceDate:{gte:fromDate,lte:toDate}}:undefined,students=await prisma.branchStudent.findMany({where:{branchId},orderBy:{studentName:"asc"},include:{installments:true,payments:{orderBy:{paymentDate:"asc"}},calendarAttendanceRecords:attendanceWhere?{where:attendanceWhere}:true,examAttempts:{include:{exam:{select:{totalMarks:true,createdAt:true}}},orderBy:{submittedAt:"asc"}},courseEnrollments:{orderBy:[{sequenceOrder:"asc"},{createdAt:"asc"}],include:{course:{select:{registrationFees:true}}}},course:{select:{registrationFees:true}},discontinuationRequests:{select:{courseId:true,status:true,reason:true,details:true,branchReviewedAt:true,superAdminReviewedAt:true,createdAt:true}}}});await attachAcademicTests(students);const branch=await prisma.branch.findUnique({where:{id:branchId},select:{branchAdminName:true,adminUser:{select:{fullName:true}}}}),adminName=branch?.adminUser?.fullName||branch?.branchAdminName,rows=students.flatMap((student)=>courseViews(student).filter((courseStudent)=>{const start=dateKey(courseStudent.courseStartDate),admissionDate=dateKey(courseStudent.admissionDate);if(mode!=="all"&&(start||admissionDate)>toDate)return false;const secondary=String(courseStudent.courseId||"")!==String(student.courseId||"");if(secondary&&String(courseStudent.arrangementType||"").toUpperCase()==="SEQUENTIAL"&&!start&&Number(courseStudent.courseProgress||0)<=0&&!courseStudent.courseCompletedAt)return false;const lifecycle=lifecycleOf(student,courseStudent);const matchesLifecycle=isMonthlyPeriod?(requestedStatus==="all"||requestedStatus===lifecycle.rowStatusKey):lifecycleMatches(lifecycle,requestedStatus,mode,fromDate,toDate,courseStudent.courseStartDate,courseStudent.courseEndDate,courseStudent.admissionDate);return matchesLifecycle&&(!isMonthlyPeriod||hasPeriodActivity(student,courseStudent,lifecycle,fromDate,toDate));}).map((courseStudent)=>buildRow(courseStudent,fromDate,toDate,adminName,lifecycleOf(student,courseStudent))));if(!rows.length)throw new AppError("No data found for the selected period and student status.",404);const selected=reportColumns(rows),columns=expandColumns(selected),expected=rows.reduce((sum,row)=>sum+Number(row.__expectedCollection||0),0),actual=rows.reduce((sum,row)=>sum+Number(row.__actualCollection||0),0),workbook=new ExcelJS.Workbook();workbook.creator="CISPRO Backend";const sheet=workbook.addWorksheet("Student Report"),last=columns.length,summaryLast=Math.max(last,12);sheet.mergeCells(1,1,1,summaryLast);sheet.getCell(1,1).value="Branch Student Status Report";sheet.getCell(1,1).font={bold:true,size:16,color:{argb:"FF17345F"}};const periodText=mode==="all"?"All Records":mode==="month"?new Date(fromDate+"T00:00:00").toLocaleString("en",{month:"long",year:"numeric"}).replace(" ","-"):mode==="year"?fromDate.slice(0,4):fromDate+" to "+toDate;sheet.mergeCells(2,1,2,summaryLast);sheet.getCell(2,1).value="Period: "+periodText+" | Status: "+(requestedStatus==="all"?"Completed + Discontinued":requestedStatus)+" | Downloaded: "+new Date().toLocaleDateString("en-GB",{timeZone:"Asia/Calcutta"});const headerRow=4,subHeaderRow=5;let columnIndex=1;selected.forEach(([key,header])=>{if(/^installment\d+$/.test(key)){const groupColumns=columns.filter((column)=>column[2]===key);sheet.mergeCells(headerRow,columnIndex,headerRow,columnIndex+groupColumns.length-1);const groupCell=sheet.getCell(headerRow,columnIndex);groupCell.value=header;headerStyle(groupCell);groupColumns.forEach((column,offset)=>{const cell=sheet.getCell(subHeaderRow,columnIndex+offset);cell.value=column[1];headerStyle(cell);});columnIndex+=groupColumns.length;}else{sheet.mergeCells(headerRow,columnIndex,subHeaderRow,columnIndex);const cell=sheet.getCell(headerRow,columnIndex);cell.value=header;headerStyle(cell);columnIndex+=1;}});const firstDataRow=subHeaderRow+1;const multiCourseIndexes=new Map();rows.forEach((row,index)=>{const key=row.studentId||("row-"+index),indexes=multiCourseIndexes.get(key)||[];indexes.push(index);multiCourseIndexes.set(key,indexes);});const multiCoursePosition=new Map();multiCourseIndexes.forEach((indexes)=>{if(indexes.length>1)indexes.forEach((index,position)=>multiCoursePosition.set(index,position));});rows.forEach((row,index)=>{const excelRow=sheet.addRow(columns.map((column)=>reportCell(row,column)));const fillColor=multiCoursePosition.has(index)?MULTI_COURSE_COLOR:COLORS[row.rowStatusKey];excelRow.eachCell((cell)=>style(cell,fillColor));});const commonColumnEnd=columns.findIndex(([key])=>key==="course");const groupedRows=new Map();rows.forEach((row,index)=>{const key=row.studentId||("row-"+index);const group=groupedRows.get(key)||[];group.push(index);groupedRows.set(key,group);});groupedRows.forEach((indexes)=>{if(indexes.length<2)return;const start=firstDataRow+indexes[0],end=firstDataRow+indexes[indexes.length-1];for(let column=1;column<=commonColumnEnd;column++)sheet.mergeCells(start,column,end,column);});sheet.views=[{state:"frozen",ySplit:subHeaderRow}];columns.forEach(([key,header],i)=>{sheet.getColumn(i+1).width=Math.min(34,Math.max(14,header.length+3,...rows.map((row)=>String(reportCell(row,[key,header])??"").length+2)));});const rawBuffer=await workbook.xlsx.writeBuffer(),statusName=requestedStatus==="all"?"All_Students":requestedStatus==="completed"?"Completed_Students":"Discontinued_Students",periodName=mode==="month"?"Monthly_"+fromDate.slice(0,7):mode==="year"?"Yearly_"+fromDate.slice(0,4):mode==="week"?"Weekly_"+fromDate:mode==="range"?"Custom_"+fromDate+"_to_"+toDate:"All_Records";return {fileName:statusName+"_"+periodName+".xlsx",contentType:CONTENT_TYPE,buffer:Buffer.from(rawBuffer)};}
export { generateBranchMonthlyReport };



