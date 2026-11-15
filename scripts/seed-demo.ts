import 'reflect-metadata';
import * as argon2 from 'argon2';
import AppDataSource from '../src/database/data-source.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { Department } from '../src/modules/departments/entities/department.entity.js';
import { Course } from '../src/modules/courses/entities/course.entity.js';
import { Semester } from '../src/modules/semesters/entities/semester.entity.js';
import { Subject } from '../src/modules/subjects/entities/subject.entity.js';
import { AcademicSession } from '../src/modules/academic-sessions/entities/academic-session.entity.js';
import { Faculty } from '../src/modules/faculty/entities/faculty.entity.js';
import { FacultySubjectAssignment } from '../src/modules/faculty/entities/faculty-subject-assignment.entity.js';
import { Student } from '../src/modules/students/entities/student.entity.js';
import { Examination } from '../src/modules/examinations/entities/examination.entity.js';
import { Question } from '../src/modules/questions/entities/question.entity.js';
import { QuestionOption } from '../src/modules/questions/entities/question-option.entity.js';
import { ExamEligibleStudent } from '../src/modules/examinations/entities/exam-eligible-student.entity.js';
import { ExamAssignment } from '../src/modules/exam-assignments/entities/exam-assignment.entity.js';
import {
  DifficultyLevel,
  ExaminationStatus,
  ExaminationType,
  NegativeMarkingType,
  QuestionType,
  UserRole,
  UserStatus,
} from '../src/shared/enums/index.js';
import { seedAdmin } from './seed-admin.js';

export async function seedDemo() {
  console.log('--- Starting Demo Data Seeding ---');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // 1. Seed Admin
  await seedAdmin();

  // 2. Department
  const deptRepo = AppDataSource.getRepository(Department);
  let dept = await deptRepo.findOne({ where: { code: 'CSE' } });
  if (!dept) {
    dept = deptRepo.create({
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering at Techno Main Salt Lake',
      isActive: true,
    });
    dept = await deptRepo.save(dept);
    console.log(`Department CSE created with ID: ${dept.id}`);
  }

  // 3. Course
  const courseRepo = AppDataSource.getRepository(Course);
  let course = await courseRepo.findOne({ where: { code: 'BTECH-CSE' } });
  if (!course) {
    course = courseRepo.create({
      departmentId: dept.id,
      name: 'Bachelor of Technology in Computer Science & Engineering',
      code: 'BTECH-CSE',
      durationYears: 4,
      totalSemesters: 8,
      isActive: true,
    });
    course = await courseRepo.save(course);
    console.log(`Course BTECH-CSE created with ID: ${course.id}`);
  }

  // 4. Semesters
  const semesterRepo = AppDataSource.getRepository(Semester);
  const semesters: Semester[] = [];
  for (let i = 1; i <= 8; i++) {
    let sem = await semesterRepo.findOne({ where: { courseId: course.id, semesterNumber: i } });
    if (!sem) {
      sem = semesterRepo.create({
        courseId: course.id,
        semesterNumber: i,
        name: `Semester ${i}`,
      });
      sem = await semesterRepo.save(sem);
    }
    semesters.push(sem);
  }
  console.log(`Semesters 1-8 initialized for course BTECH-CSE.`);

  // 5. Academic Session
  const sessionRepo = AppDataSource.getRepository(AcademicSession);
  let session = await sessionRepo.findOne({ where: { name: '2025-2026' } });
  if (!session) {
    session = sessionRepo.create({
      name: '2025-2026',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-07-31'),
      isCurrent: true,
    });
    session = await sessionRepo.save(session);
    console.log(`Academic session 2025-2026 created with ID: ${session.id}`);
  }

  // 6. Subject (Semester 5: Data Structures and Algorithms)
  const subjectRepo = AppDataSource.getRepository(Subject);
  let subject = await subjectRepo.findOne({ where: { code: 'CS301' } });
  if (!subject) {
    subject = subjectRepo.create({
      courseId: course.id,
      semesterId: semesters[4].id, // Semester 5
      name: 'Data Structures and Algorithms',
      code: 'CS301',
      credits: 4,
      description: 'Core computer science course covering arrays, lists, trees, graphs, and dynamic programming.',
      isActive: true,
    });
    subject = await subjectRepo.save(subject);
    console.log(`Subject CS301 created with ID: ${subject.id}`);
  }

  // 7. Faculty User & Profile
  const userRepo = AppDataSource.getRepository(User);
  const facultyRepo = AppDataSource.getRepository(Faculty);
  let facultyUser = await userRepo.findOne({ where: { username: 'faculty01' } });
  let faculty: Faculty;
  if (!facultyUser) {
    const facultyPasswordHash = await argon2.hash('Faculty@12345', { type: argon2.argon2id });
    facultyUser = userRepo.create({
      username: 'faculty01',
      email: 'faculty01@exanova.edu',
      passwordHash: facultyPasswordHash,
      role: UserRole.FACULTY,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    });
    facultyUser = await userRepo.save(facultyUser);

    faculty = facultyRepo.create({
      userId: facultyUser.id,
      employeeId: 'FAC-001',
      firstName: 'Ramesh',
      lastName: 'Sharma',
      designation: 'Associate Professor',
      phone: '+919876543210',
      departmentId: dept.id,
    });
    faculty = await facultyRepo.save(faculty);
    console.log(`Faculty user [faculty01] created with Faculty ID: ${faculty.id}`);
  } else {
    faculty = (await facultyRepo.findOne({ where: { userId: facultyUser.id } }))!;
  }

  // Assign faculty to subject
  const fsaRepo = AppDataSource.getRepository(FacultySubjectAssignment);
  let fsa = await fsaRepo.findOne({
    where: { facultyId: faculty.id, subjectId: subject.id, academicSessionId: session.id },
  });
  if (!fsa) {
    fsa = fsaRepo.create({
      facultyId: faculty.id,
      subjectId: subject.id,
      academicSessionId: session.id,
    });
    await fsaRepo.save(fsa);
    console.log(`Assigned Faculty ${faculty.employeeId} to Subject ${subject.code}`);
  }

  // 8. Student User & Profile (Roll Number: 230001)
  const studentRepo = AppDataSource.getRepository(Student);
  let studentUser = await userRepo.findOne({ where: { username: '230001' } });
  let student: Student;
  if (!studentUser) {
    const studentPasswordHash = await argon2.hash('Student@12345', { type: argon2.argon2id });
    studentUser = userRepo.create({
      username: '230001',
      email: 'student230001@exanova.edu',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      mustChangePassword: true, // Force change password on first login!
    });
    studentUser = await userRepo.save(studentUser);

    student = studentRepo.create({
      userId: studentUser.id,
      rollNumber: '230001',
      registrationNumber: 'REG-2023-0001',
      firstName: 'Aarav',
      lastName: 'Sen',
      phone: '+919123456789',
      departmentId: dept.id,
      courseId: course.id,
      currentSemesterId: semesters[4].id,
      academicSessionId: session.id,
    });
    student = await studentRepo.save(student);
    console.log(`Student user [230001] created with Student ID: ${student.id} (mustChangePassword: true)`);
  } else {
    student = (await studentRepo.findOne({ where: { userId: studentUser.id } }))!;
  }

  // 9. Sample Examination with Authoritative Test ID UUID
  const examRepo = AppDataSource.getRepository(Examination);
  let exam = await examRepo.findOne({ where: { examinationCode: 'DSA-MIDTERM-2026' } });
  if (!exam) {
    const now = new Date();
    const startDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days ahead

    exam = examRepo.create({
      title: 'Data Structures & Algorithms Midterm Assessment 2026',
      examinationCode: 'DSA-MIDTERM-2026',
      description: 'Official Midterm Assessment for CSE 5th Semester. Covers Linear Data Structures, Trees, and Sorting Algorithms.',
      departmentId: dept.id,
      courseId: course.id,
      semesterId: semesters[4].id,
      subjectId: subject.id,
      academicSessionId: session.id,
      createdByFacultyId: faculty.id,
      examinationType: ExaminationType.MIXED,
      status: ExaminationStatus.PUBLISHED,
      startDate,
      endDate,
      duration: 60, // 60 minutes
      totalMarks: '50.00',
      passingMarks: '20.00',
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      negativeMarkingType: NegativeMarkingType.FIXED,
      negativeMarkingValue: '0.25',
      allowNegativeMarksBelowZero: false,
      instructions: '1. All MCQs carry 2 marks each with 0.25 negative marks.\n2. Descriptive questions must be answered concisely.\n3. Do not switch browser tabs during examination.',
      resultVisibility: false,
    });
    exam = await examRepo.save(exam);
    console.log(`Examination created with Test ID UUID: ${exam.id}`);

    // Assign faculty as evaluator
    const examAssignRepo = AppDataSource.getRepository(ExamAssignment);
    const assignment = examAssignRepo.create({
      testId: exam.id,
      facultyId: faculty.id,
      role: 'CREATOR',
    });
    await examAssignRepo.save(assignment);

    // Make student eligible
    const eligibleRepo = AppDataSource.getRepository(ExamEligibleStudent);
    const eligibleStudent = eligibleRepo.create({
      testId: exam.id,
      studentId: student.id,
      isEligible: true,
    });
    await eligibleRepo.save(eligibleStudent);

    // Add Questions
    const questionRepo = AppDataSource.getRepository(Question);
    const optionRepo = AppDataSource.getRepository(QuestionOption);

    // Question 1: MCQ
    const q1 = await questionRepo.save(
      questionRepo.create({
        testId: exam.id,
        questionText: 'What is the time complexity of searching an element in a balanced Binary Search Tree (AVL)?',
        questionType: QuestionType.MCQ,
        marks: '2.00',
        negativeMarks: '0.25',
        topic: 'Binary Search Trees',
        difficulty: DifficultyLevel.MEDIUM,
        questionOrder: 1,
      }),
    );

    await optionRepo.save([
      optionRepo.create({ questionId: q1.id, optionLabel: 'A', optionText: 'O(1)', isCorrect: false, optionOrder: 1 }),
      optionRepo.create({ questionId: q1.id, optionLabel: 'B', optionText: 'O(log n)', isCorrect: true, optionOrder: 2 }),
      optionRepo.create({ questionId: q1.id, optionLabel: 'C', optionText: 'O(n)', isCorrect: false, optionOrder: 3 }),
      optionRepo.create({ questionId: q1.id, optionLabel: 'D', optionText: 'O(n log n)', isCorrect: false, optionOrder: 4 }),
    ]);

    // Question 2: MCQ
    const q2 = await questionRepo.save(
      questionRepo.create({
        testId: exam.id,
        questionText: 'Which data structure works on the First In First Out (FIFO) principle?',
        questionType: QuestionType.MCQ,
        marks: '2.00',
        negativeMarks: '0.25',
        topic: 'Linear Data Structures',
        difficulty: DifficultyLevel.EASY,
        questionOrder: 2,
      }),
    );

    await optionRepo.save([
      optionRepo.create({ questionId: q2.id, optionLabel: 'A', optionText: 'Stack', isCorrect: false, optionOrder: 1 }),
      optionRepo.create({ questionId: q2.id, optionLabel: 'B', optionText: 'Queue', isCorrect: true, optionOrder: 2 }),
      optionRepo.create({ questionId: q2.id, optionLabel: 'C', optionText: 'Priority Queue', isCorrect: false, optionOrder: 3 }),
      optionRepo.create({ questionId: q2.id, optionLabel: 'D', optionText: 'Binary Tree', isCorrect: false, optionOrder: 4 }),
    ]);

    // Question 3: Descriptive
    await questionRepo.save(
      questionRepo.create({
        testId: exam.id,
        questionText: 'Explain the difference between Dijkstra algorithm and Bellman-Ford algorithm for finding the shortest path in a graph.',
        questionType: QuestionType.DESCRIPTIVE,
        marks: '10.00',
        negativeMarks: '0.00',
        topic: 'Graph Algorithms',
        difficulty: DifficultyLevel.HARD,
        questionOrder: 3,
        answerInstructions: 'Discuss approach, time complexity, and handling of negative edge weights.',
        evaluationCriteria: 'Approach comparison (4 marks), Negative edge weight explanation (3 marks), Complexity analysis (3 marks)',
        expectedAnswer: 'Dijkstra uses greedy approach with min-priority queue and does not handle negative edge weights. Bellman-Ford uses dynamic programming, relaxes all edges |V|-1 times, handles negative edges and detects negative cycles.',
      }),
    );

    console.log(`Questions seeded for Test ID UUID: ${exam.id}`);
  }

  console.log('--- Demo Data Seeding Completed Successfully ---');
}

if (process.argv[1]?.endsWith('seed-demo.ts') || process.argv[1]?.endsWith('seed-demo.js')) {
  seedDemo()
    .then(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error seeding demo data:', err);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
