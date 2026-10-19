# แผนภาพคลาส (Class Diagram)
## โครงการ: The Note Nurse (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้แสดงโครงสร้างเชิงวัตถุ (Domain Class Model) ของระบบ The Note Nurse ประกอบด้วย Attributes, Methods และความสัมพันธ์ระหว่าง Entity ต่างๆ ที่สอดคล้องตามกฎหมาย PDPA (De-identified Health Model)

---

### 1. แผนภาพ Class Diagram (Mermaid Graph)

```mermaid
classDiagram
    %% Class Definitions

    class User {
        +String userId
        +String staffId
        +String email
        +String fullName
        +String nickname
        +Role role
        +String wardId
        +String boundDeviceId
        +String deviceToken
        +String pinHash
        +String passwordHash
        +AuthProvider authProvider
        +Boolean pdpaConsentAccepted
        +Int expPoints
        +Int level
        +register(data: RegisterRequest) Boolean
        +verifyPassword(password: String) Boolean
        +verifyPin(pin: String) Boolean
        +bindDevice(deviceId: String, deviceName: String) Boolean
        +validateDevice(deviceId: String) Boolean
        +resetPassword(token: String) Boolean
        +addExp(points: Int) void
    }

    class AuthProvider {
        <<enumeration>>
        LOCAL_PASSWORD
        GOOGLE
        LINE
        FACEBOOK
    }

    class Role {
        <<enumeration>>
        JUNIOR_NURSE
        SENIOR_NURSE
        CHARGE_NURSE
        SYSTEM_ADMIN
    }

    class ShiftRoster {
        +String rosterId
        +String userId
        +DateTime shiftDate
        +ShiftType shiftType
        +List~String~ assignedBedIds
        +addBed(bedId: String) void
        +removeBed(bedId: String) void
    }

    class ShiftType {
        <<enumeration>>
        MORNING
        AFTERNOON
        NIGHT
    }

    class Bed {
        +String bedId
        +String bedNumber
        +String wardId
        +String age
        +String gender
        +String primaryDiagnosis
        +AcuityLevel acuityLevel
        +List~String~ activeLines
        +List~String~ highAlertDrugs
        +DateTime updatedAt
        +updateStatus(acuity: AcuityLevel) void
        +addDrug(drugName: String) void
    }

    class AcuityLevel {
        <<enumeration>>
        CRITICAL_RED
        WARNING_YELLOW
        STABLE_GREEN
    }

    class HandoverNote {
        +String noteId
        +String bedId
        +String authorId
        +DateTime handoverTime
        +ShiftType shift
        +String situation
        +String background
        +String assessment
        +String recommendation
        +List~String~ preceptorQuestions
        +String rawSpeechText
        +Boolean isAiPowered
        +Int revisionNumber
        +exportForLine() String
        +generateCheatSheet() List~String~
    }

    class SeniorPearl {
        +String pearlId
        +String authorId
        +String authorDisplayName
        +String title
        +String content
        +PearlCategory category
        +Int heartCount
        +DateTime createdAt
        +Boolean isPinned
        +addReaction() void
        +convertToQuiz() QuizQuestion
    }

    class PearlCategory {
        <<enumeration>>
        HIGH_ALERT_DRUGS
        EKG_MONITOR
        PROCEDURES
        HANDOVER_TIPS
        ENCOURAGEMENT
    }

    class ClinicalGuide {
        +String guideId
        +String topic
        +GuideType guideType
        +String summary
        +String clinicalDetails
        +List~String~ keyWatchpoints
        +searchGuide(keyword: String) List~ClinicalGuide~
    }

    class GuideType {
        <<enumeration>>
        DRUG_PROTOCOL
        ARRHYTHMIA_STRIP
        LAB_INTERPRETATION
        POST_PCI_CARE
    }

    class QuizQuestion {
        +String questionId
        +String sourcePearlId
        +String questionText
        +List~String~ choices
        +Int correctIndex
        +String rationale
        +Int expReward
        +verifyAnswer(selectedIdx: Int) Boolean
    }

    class AuditLog {
        +String logId
        +String userId
        +String action
        +String targetResource
        +String ipAddress
        +DateTime timestamp
        +Boolean isSecurityEvent
    }

    %% Relationships
    User "1" --> "1" Role : has
    User "1" --> "*" ShiftRoster : registers
    ShiftRoster "1" --> "*" Bed : assigns
    Bed "1" --> "1" AcuityLevel : classified_by
    Bed "1" --> "*" HandoverNote : contains_history
    User "1" --> "*" HandoverNote : creates
    User "1" --> "*" SeniorPearl : writes
    SeniorPearl "1" --> "1" PearlCategory : categorized_as
    SeniorPearl "1" ..> "0..*" QuizQuestion : generates
    User "1" ..> "*" QuizQuestion : solves
    ClinicalGuide "1" --> "1" GuideType : typed_as
    User "1" --> "*" AuditLog : generates_activity
```

---

### 2. คำอธิบาย Entity สำคัญและการปฏิบัติตาม PDPA

| คลาส (Class) | คำอธิบายและความสำคัญ | หมายเหตุความปลอดภัย / PDPA |
| :--- | :--- | :--- |
| **User** | ข้อมูลพยาบาลผู้ใช้งานในระบบ สังกัดวอร์ด และระดับเลเวล | จัดเก็บรหัสผ่านแบบ Salted Hash, เก็บ PIN แยกต่างหาก |
| **ShiftRoster** | การจัดเวรปฏิบัติงาน (เช้า/บ่าย/ดึก) และเตียงที่รับผิดชอบ | ช่วยจำกัดสิทธิ์ให้พยาบาลเห็นเฉพาะเตียงที่ตนเองดูแล |
| **Bed** | ตัวแทนคนไข้และเตียงในวอร์ด (เช่น เตียง 2 CCU) | **ไม่มีการเก็บชื่อ นามสกุลจริง หรือ HN** ใช้เพียง Bed Number, อายุ, เพศ และข้อมูลโรค |
| **HandoverNote** | โน้ตส่งเวรโครงสร้าง SBAR พร้อมคำถาม Cheat Sheet | เก็บประวัติเป็น Revision ป้องกันการลบทำลายย้อนหลังตามข้อกำหนดเวชระเบียน |
| **SeniorPearl** | เกร็ดความรู้และทริคที่รุ่นพี่แบ่งปัน | สามารถแปลงเนื้อหาไปเป็นโจทย์ควิซได้แบบอัตโนมัติ |
| **QuizQuestion** | ธนาคารคำถามทบทวนความรู้ทางคลินิก | มีเฉลยและเหตุผลทางการพยาบาล (Rationale) พร้อมแต้ม EXP |
| **AuditLog** | บันทึกประวัติการเข้าใช้งานและความปลอดภัย | เก็บรักษาย้อนหลังไม่น้อยกว่า 90 วันตามมาตรฐาน PDPA |

