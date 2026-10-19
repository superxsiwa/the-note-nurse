# แผนภาพส่วนประกอบของระบบ (Components Diagram)
## โครงการ: The Note Nurse (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้อธิบายสถาปัตยกรรมเชิงส่วนประกอบ (Component Architecture) ของระบบ **The Note Nurse** โดยแบ่งตามระดับชั้นการทำงาน (Tiered Architecture) พร้อมระบบรักษาความปลอดภัยและการปกป้องข้อมูลส่วนบุคคล (PDPA Compliance)

---

### 1. แผนภาพภาพรวมส่วนประกอบระบบ (System Components Diagram)

```mermaid
graph TD
    %% Styling Classes
    classDef client fill:#EBF5FB,stroke:#2980B9,stroke-width:2px,color:#1B4F72;
    classDef gateway fill:#FEF9E7,stroke:#F39C12,stroke-width:2px,color:#7D6608;
    classDef core fill:#E8F8F5,stroke:#27AE60,stroke-width:2px,color:#145A32;
    classDef sec fill:#FDEDEC,stroke:#E74C3C,stroke-width:2px,color:#78281F;
    classDef ext fill:#F4ECF7,stroke:#8E44AD,stroke-width:2px,color:#512E5F;
    classDef data fill:#EAEDED,stroke:#7F8C8D,stroke-width:2px,color:#2C3E50;

    subgraph ClientLayer ["1. Frontend Presentation Layer (Client Application)"]
        UI_Bed ["🛏️ Shift & Bed Component<br/>(เลือกเวร, การ์ดเตียง, โอนเวร)"]:::client
        UI_Voice ["🎙️ Voice & SBAR Component<br/>(อัดเสียง, ถอดความ, พิมพ์ส่งเวร)"]:::client
        UI_CheatSheet ["💡 Preceptor Cheat Sheet<br/>(หน้าต่างดักคำถามรุ่นพี่)"]:::client
        UI_Pearls ["👩‍⚕️ Senior Pearls Component<br/>(บอร์ดเกร็ดความรู้ & กดหัวใจ)"]:::client
        UI_Knowledge ["📚 Knowledge Hub Component<br/>(คู่มือ CCU, ยา, EKG, Chat Tutor)"]:::client
        UI_Quiz ["🎮 Clinical Quiz Component<br/>(เกมควิซ & สะสม EXP)"]:::client
        UI_Auth ["🔐 Auth & PIN Component<br/>(หน้า Login, สลับ PIN, จัดการสิทธิ์)"]:::client
    end

    subgraph GatewayLayer ["2. API Gateway & Security Pipeline"]
        APIGateway ["🌐 HTTP/HTTPS Reverse Proxy<br/>(Static Serving, Routing, CORS)"]:::gateway
        AuthMiddleware ["🛡️ Auth & RBAC Guard<br/>(JWT Verify, Session, Role Check)"]:::gateway
        PDPASanitizer ["🛡️ PDPA Data Sanitizer<br/>(De-identification, Mask HN/Name)"]:::sec
        AuditLogger ["📝 Audit & Access Logger<br/>(บันทึก Log กิจกรรม 90 วัน)"]:::sec
    end

    subgraph CoreServiceLayer ["3. Application & Business Logic Services"]
        AuthService ["🔑 Identity & Access Service<br/>(User, PIN, Role & Permissions)"]:::core
        ShiftBedService ["📋 Shift & Bed Management Service<br/>(จัดเวร, สถานะเตียง, บัตรคนไข้)"]:::core
        HandoverShareService ["📤 Handover Sharing Service<br/>(สร้างข้อความส่ง LINE, Export การ์ด)"]:::core
        VoiceSbarService ["🧠 SBAR Structuring Service<br/>(แปลงเสียง/ข้อความเป็น SBAR)"]:::core
        SeniorPearlsService ["💬 Senior Pearls Service<br/>(จัดการโพสต์ทริค, Reaction)"]:::core
        KnowledgeHubService ["📖 Knowledge Hub Service<br/>(ค้นหาคู่มือ CCU, Smart Tutor)"]:::core
        QuizService ["🎯 Clinical Quiz Service<br/>(สร้างโจทย์, ตรวจคำตอบ, คำนวณ EXP)"]:::core
        RuleParserEngine ["⚙️ Local Clinical Fallback Parser<br/>(Rule-based Regex & Lexicon)"]:::core
    end

    subgraph ExternalServices ["4. External AI & Cloud Services"]
        GeminiMultimodal ["🤖 Gemini Audio API<br/>(Speech-to-Text ถอดศัพท์แพทย์)"]:::ext
        GeminiSbarLLM ["🤖 Gemini LLM Service<br/>(แปลงเป็น SBAR & วิเคราะห์คำถาม)"]:::ext
        GeminiTutor ["🤖 Gemini Tutor Agent<br/>(ตอบข้อสงสัยการพยาบาล)"]:::ext
    end

    subgraph DataStorageLayer ["5. Persistence & Storage Layer"]
        DB_Users [("👥 User & Role Store<br/>(ข้อมูลพยาบาล, PIN, สิทธิ์)")]:::data
        DB_Beds [("🛏️ Bed & Patient Store<br/>(ข้อมูลเตียง, สายยาง, ยาเสี่ยงสูง)")]:::data
        DB_Handovers [("📋 Handover Records Store<br/>(ประวัติ SBAR, Revision Log)")]:::data
        DB_Pearls [("💡 Senior Pearls Store<br/>(เกร็ดความรู้, หัวใจ/ขอบคุณ)")]:::data
        DB_Knowledge [("📚 CCU Clinical Repo<br/>(คู่มือยา, EKG strip, Lab)")]:::data
        DB_Audit [("🔒 Immutable Audit Store<br/>(Log ความปลอดภัยตาม PDPA)")]:::data
    end

    %% Client to Gateway
    UI_Auth --> APIGateway
    UI_Bed --> APIGateway
    UI_Voice --> APIGateway
    UI_CheatSheet --> APIGateway
    UI_Pearls --> APIGateway
    UI_Knowledge --> APIGateway
    UI_Quiz --> APIGateway
    UI_Auth --> APIGateway

    %% Gateway Pipeline
    APIGateway --> AuthMiddleware
    AuthMiddleware --> AuditLogger
    AuthMiddleware --> PDPASanitizer

    %% Gateway to Core Services
    PDPASanitizer --> AuthService
    PDPASanitizer --> ShiftBedService
    PDPASanitizer --> HandoverShareService
    PDPASanitizer --> VoiceSbarService
    PDPASanitizer --> SeniorPearlsService
    PDPASanitizer --> KnowledgeHubService
    PDPASanitizer --> QuizService

    %% Service to External AI (through PDPA Sanitization)
    VoiceSbarService --> |Cleaned Audio| GeminiMultimodal
    VoiceSbarService --> |Masked Text| GeminiSbarLLM
    VoiceSbarService -.-> |Offline/Fallback| RuleParserEngine
    KnowledgeHubService --> GeminiTutor
    SeniorPearlsService --> |แปลงทริคเป็นโจทย์| QuizService

    %% Core Services to Data Layer
    AuthService --> DB_Users
    ShiftBedService --> DB_Beds
    HandoverShareService --> DB_Beds
    VoiceSbarService --> DB_Handovers
    SeniorPearlsService --> DB_Pearls
    KnowledgeHubService --> DB_Knowledge
    QuizService --> DB_Knowledge
    AuditLogger --> DB_Audit
```

---

### 2. คำอธิบายรายละเอียดของแต่ละส่วนประกอบ (Component Descriptions)

#### 2.1 Presentation Layer (Frontend Components)
- **🛏️ Shift & Bed Component:** จัดการเลือกรอบเวร (เช้า/บ่าย/ดึก), หน้าต่างแสดงบัตรข้อมูลเตียง (Bed Cards), การเปลี่ยนสถานะความวิกฤต (Acuity Tag) และส่งต่อข้อมูล
- **🎙️ Voice & SBAR Component:** บันทึกเสียงพูดผ่าน Web Audio API, แปลงเป็น Base64 แบบชั่วคราว, แสดงผลลัพธ์โครงสร้าง Situation, Background, Assessment, Recommendation
- **💡 Preceptor Cheat Sheet Component:** หน้าต่างเตือนแสดง "คำถามที่รุ่นพี่/แพทย์มักจะถามจี้" ให้น้องเตรียมตัวก่อนเดินไปส่งเวร
- **👩‍⚕️ Senior Pearls Component:** กระดานอ่านเกร็ดความรู้ประจำวัน และฟอร์มสำหรับรุ่นพี่แชร์ทริค พร้อมปุ่มกดแสดงความขอบคุณ (Heart Reaction)
- **📚 Knowledge Hub & Tutor Component:** ระบบค้นหาคู่มือ CCU พกพา (ยาเสี่ยงสูง, แถบ EKG, แปลผลแล็บ) และช่องสนทนาถาม-ตอบกับ AI ติวเตอร์
- **🎮 Clinical Quiz Component:** หน้าต่างทำควิซสั้นๆ ประจำวัน, บันทึกสถิติ, แสดงคะแนนและแต้ม EXP
- **🔐 Auth & Access Component:** หน้าจอยืนยันตัวตนและการลงทะเบียนมาตรฐาน รองรับ Email/Staff ID + Password, เข้าสู่ระบบด้วย Social Login (Google, LINE, Facebook), ระบบ Show/Hide รหัสผ่าน, ลืมรหัสผ่าน, จดจำการเข้าสู่ระบบ (Remember Me), แผงสลับบทบาทจำลอง (Role Quick Access สำหรับ Prototype), ฟอร์มลงทะเบียนพร้อมตั้งและยืนยันรหัส Quick PIN 4 หลัก, ระบบล็อกหน้าจออัตโนมัติเมื่อพักเครื่อง 5 นาที (Inactivity Lock) พร้อม Keypad ปลดล็อกด่วนด้วย Quick PIN และปุ่มออกจากระบบ (Logout)

#### 2.2 Security & Gateway Layer
- **🌐 API Gateway / Reverse Proxy:** รับ Request จาก Client, จัดการเส้นทาง URL, จัดการ CORS และ Static Files
- **🛡️ Auth & RBAC Guard:** ตรวจสอบ Token (JWT), สิทธิ์การเข้าถึงตามบทบาท (Junior, Senior, Charge Nurse, Admin) และตรวจสอบ OAuth Identity จาก Social Providers
- **🛡️ PDPA Data Sanitizer:** ตัดและปิดบังข้อมูลที่ระบุตัวตน (เช่น ชื่อ-นามสกุล, เลขประจำตัวประชาชน, เลข HN) ก่อนส่งต่อให้ AI ภายนอก
- **📝 Audit & Access Logger:** บันทึกการเข้าใช้งาน การส่งต่อข้อมูล และเหตุการณ์สำคัญลงใน Log ตามข้อกำหนดกฎหมาย PDPA

#### 2.3 Business Logic & Service Layer
- **🔑 Identity & Access Service:** ดูแลการลงทะเบียนสมาชิกพยาบาล, ตรวจสอบความถูกต้องของ Quick PIN และ Confirm PIN, การเข้าสู่ระบบด้วยรหัสผ่านหรือ Social Login, จัดเก็บรหัสผ่านแบบ Salted Hash, และตรวจสอบ PIN รวดเร็วกรณี Inactivity Unlock
- **📋 Shift & Bed Management Service:** ประมวลผลสถานะเตียงในวอร์ด, จัดกลุ่มเตียงตามที่พยาบาลแต่ละคนรับผิดชอบ
- **📤 Handover Sharing Service:** จัดรูปแบบข้อความส่งต่อเตียงสำหรับแชร์ลง LINE, สร้างใบสรุปส่งเวรประจำรอบ (Shift Summary Sheet)
- **🧠 SBAR Structuring Service:** ประสานงานกับ AI เพื่อแปลงข้อความ/เสียงเป็นโครงสร้าง SBAR พร้อมวิเคราะห์จุดที่ต้องระวัง
- **⚙️ Local Clinical Fallback Parser:** โมดูลสำรองทำงานด้วยกฎทางคลินิก (Rule-based) ทำงานได้ทันทีเมื่อไม่มีอินเทอร์เน็ต
- **💬 Senior Pearls Service:** ดูแลการบันทึก, แก้ไข, ปักหมุดทริคของรุ่นพี่ และนับยอดหัวใจ
- **📖 Knowledge Hub & 🎯 Quiz Service:** คลังข้อมูลทางวิชาการและกลไกสร้างโจทย์ควิซ พร้อมคำนวณแต้มสะสม

#### 2.4 External AI Services
- **🤖 Gemini Audio API:** โมเดลประมวลผลเสียงทางการแพทย์ แปลงเป็นข้อความต่อเนื่อง
- **🤖 Gemini SBAR & Tutor:** วิเคราะห์ข้อมูลทางคลินิก, จัดกลุ่ม SBAR, ออกโจทย์ควิซ และตอบข้อสงสัยทางการพยาบาล

#### 2.5 Data Storage Layer
- **DB_Users:** จัดเก็บข้อมูลผู้ใช้งาน, รหัสผ่านแบบเข้ารหัส, สิทธิ์ RBAC
- **DB_Beds & DB_Handovers:** จัดเก็บข้อมูลเตียง, อาการ, ข้อมูลสายระบาย, ประวัติการส่งเวร (แบบแก้ไขย้อนหลังไม่ได้)
- **DB_Pearls & DB_Knowledge:** ฐานข้อมูลเกร็ดความรู้ของวอร์ด และคู่มือทางคลินิก
- **DB_Audit:** ฐานข้อมูล Log ความปลอดภัย สำหรับตรวจสอบย้อนหลังตามมาตรฐาน PDPA (เก็บไม่น้อยกว่า 90 วัน)

---

*แผนภาพและโครงสร้างส่วนประกอบนี้ ออกแบบเพื่อให้สอดรับกับข้อกำหนด [REQUIREMENT_AND_SCOPE.md](file:///home/superx-desktop/Documents/0_app_projects/the-note-nurse/documents/REQUIREMENT_AND_SCOPE.md) อย่างสมบูรณ์*

