# แผนภาพลำดับขั้นตอนการทำงาน (Sequence Diagram)
## โครงการ: The Note Nurse (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้แสดงลำดับการส่งข้อมูลระหว่างวัตถุ (Sequence of Interactions) ใน 4 กระบวนการหลักของระบบ:
1. **Flow 0: การเข้าสู่ระบบด้วย Email & Password ➡️ ปลดล็อกด่วนด้วย Quick PIN (Authentication Flow)**
2. **Flow 1: การบันทึกเสียง ➡️ กรอง PDPA ➡️ สร้างรายงาน SBAR + Cheat Sheet ดักคำถาม**
3. **Flow 2: การแชร์สรุปข้อมูลเตียงคนไข้ให้เพื่อน (Handover Sharing via LINE / Clipboard)**
4. **Flow 3: การเผยแพร่เกร็ดความรู้จากรุ่นพี่ ➡️ แปลงเป็นโจทย์ควิซ ➡️ รุ่นน้องฝึกทำข้อสอบ**

---

### Flow 0: การลงทะเบียน, เข้าสู่ระบบ (Email/Social) ➡️ ปลดล็อกด่วนด้วย Quick PIN (Auth & Registration Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as 👩‍⚕️ พยาบาลผู้ใช้งาน (Nurse)
    participant UI as 📱 Auth, Register & PIN UI
    participant Gateway as 🌐 API Gateway & RBAC Guard
    participant AuthSvc as 🔑 Identity & Auth Service
    participant UserDB as 💾 User Database
    participant Audit as 🔒 Audit Logger

    %% Part 1: Registration with Confirm Quick PIN
    opt การลงทะเบียนพยาบาลใหม่ (New Nurse Registration)
        Nurse->>UI: 1. ป้อนชื่อ-นามสกุล, รหัสพนักงาน, อีเมล, เลือกวอร์ด, รหัสผ่าน
        Nurse->>UI: 2. ตั้งรหัส Quick PIN (4 หลัก) + ยืนยันรหัส Confirm PIN (4 หลัก)
        Nurse->>UI: 3. ติ๊กยินยอมรับข้อกำหนด PDPA และกด "ยืนยันการลงทะเบียน"
        UI->>UI: 4. ตรวจสอบ Quick PIN == Confirm PIN (ทั้งสองช่องตรงกัน)
        UI->>Gateway: 5. POST /api/auth/register { fullName, staffId, email, ward, password, pin, deviceId }
        Gateway->>AuthSvc: 6. Hash รหัสผ่าน (Argon2) + Hash PIN + ผูก DeviceId
        AuthSvc->>UserDB: 7. บันทึกข้อมูลพยาบาลใหม่
        UserDB-->>AuthSvc: 8. บันทึกสำเร็จ
        AuthSvc-->>Gateway: 9. ส่งผลลงทะเบียนสำเร็จ + Auto-issue Session
        Gateway-->>UI: 10. แจ้งเตือนสำเร็จและเข้าสู่ระบบทันที
    end

    %% Part 2: Standard Login or Social Login
    alt เข้าสู่ระบบด้วย Email & Password หรือ Social Login
        Nurse->>UI: 11. ป้อน Email + Password (หรือกดปุ่ม Google / LINE / Facebook)
        UI->>Gateway: 12. POST /api/auth/login หรือ POST /api/auth/social-callback
        Gateway->>Audit: 13. บันทึก Attempt Log (IP, User, DeviceId, Timestamp)
        Gateway->>AuthSvc: 14. ตรวจสอบข้อมูลประจำตัว + DeviceId
        AuthSvc->>UserDB: 15. ดึงข้อมูล User และ Device Binding
        alt ข้อมูลถูกต้อง & เครื่องตรงตามเงื่อนไข BYOD
            AuthSvc-->>Gateway: 16. สร้าง JWT Session Token + User Role
            Gateway->>Audit: 17. Log Success: Personal Device Login Succeeded
            Gateway-->>UI: 18. ส่ง Session Token + ข้อมูลพยาบาล
            UI-->>Nurse: 19. แสดงหน้าต่างจัดเวรและเตียงที่ดูแล (Shift & Bed Roster)
        else ข้อมูลไม่ถูกต้อง
            AuthSvc-->>Gateway: Login Failed
            Gateway-->>UI: แจ้งเตือนข้อผิดพลาด
        end
    end

    %% Part 3: 5-Minute Inactivity Auto-Lock & Quick PIN Unlock
    Note over Nurse, UI: วางเครื่องทิ้งไว้เกิน 5 นาที (Inactivity Timeout) หรือกดทดสอบจำลอง
    UI->>UI: 20. ตรวจพบ Inactivity ครบ 5 นาที ➔ เด้ง Quick PIN Keypad Modal ล็อกหน้าจอทันที
    Nurse->>UI: 21. กดรหัส Quick PIN 4 หลักบน Keypad
    UI->>UI: 22. ตรวจสอบรหัส PIN ตรงกับที่ลงทะเบียนไว้
    alt PIN ถูกต้อง
        UI-->>Nurse: 23. ปลดล็อกทันที กลับสู่หน้าจอการทำงานเดิมโดยไม่ต้องกรอกรหัสผ่านยาว
    else PIN ไม่ถูกต้อง
        UI-->>Nurse: 24. แจ้งเตือนรหัส PIN ไม่ถูกต้อง และสั่นเตือน
    end
```

---

### Flow 1: การบันทึกเสียง ➡️ กรอง PDPA ➡️ แปลงเป็น SBAR + Cheat Sheet ดักคำถาม

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as 👩‍⚕️ พยาบาลรุ่นน้อง (Junior Nurse)
    participant UI as 📱 Voice/SBAR UI
    participant Gateway as 🛡️ API Gateway & Sanitizer (PDPA)
    participant AudioAPI as 🤖 Gemini Audio API (STT)
    participant SbarSvc as 🧠 SBAR & CheatSheet Service
    participant GeminiLLM as 🤖 Gemini LLM Engine
    participant Fallback as ⚙️ Rule-based Parser (Fallback)
    participant DB as 💾 Handover Database
    participant Audit as 🔒 Audit Logger

    Nurse->>UI: 1. แตะปุ่มอัดเสียง เล่าอาการคนไข้ภาษาพูด
    UI-->>Nurse: แสดงคลื่นเสียงกำลังบันทึก (Recording...)
    Nurse->>UI: 2. แตะหยุดบันทึกเสียง (Stop & Process)
    
    UI->>Gateway: 3. ส่ง Audio (Base64) + BedNo (เช่น "เตียง 2")
    Gateway->>Audit: 4. บันทึก Audit Log (User, Bed, Action: VoiceNote)
    
    Gateway->>AudioAPI: 5. ส่งเสียงแปลงเป็นข้อความ (Ephemeral Stream)
    alt ถอดเสียงสำเร็จ
        AudioAPI-->>Gateway: 6. ส่งข้อความดิบกลับ (Raw Clinical Text)
    else ล้มเหลว / ไม่มีเน็ต
        AudioAPI-->>Gateway: Error Timeout
        Gateway->>UI: แจ้งเตือนใช้ระบบพิมพ์ข้อความแทน
    end

    Gateway->>Gateway: 7. 🛡️ PDPA Filter: ตรวจจับ & Masking ชื่อ/HN ออก
    Gateway->>SbarSvc: 8. ส่งข้อความที่ Clean แล้ว + ข้อมูลเตียง
    
    SbarSvc->>GeminiLLM: 9. Prompt: สรุป SBAR + สรุปคำถามที่รุ่นพี่มักจะถามจี้
    alt Gemini AI ตอบกลับปกติ
        GeminiLLM-->>SbarSvc: 10. JSON: { S, B, A, R, cheatSheetQuestions }
    else Gemini Offline
        SbarSvc->>Fallback: 11. ใช้ Rule-based Regex สกัดค่า BP, HR, O2, แผนยา
        Fallback-->>SbarSvc: 12. Fallback SBAR Object
    end

    SbarSvc->>DB: 13. บันทึก SBAR Note ลงฐานข้อมูล (Revision 1)
    SbarSvc-->>UI: 14. ส่งผลลัพธ์ SBAR + คำถาม Cheat Sheet
    UI-->>Nurse: 15. แสดงผลบนหน้าจอ น้องอ่านซ้อมก่อนเดินไปส่งเวร
```

---

### Flow 2: การแชร์สรุปข้อมูลเตียงคนไข้ให้เพื่อน (Handover Sharing via LINE / Clipboard)

```mermaid
sequenceDiagram
    autonumber
    actor NurseA as 👩‍⚕️ พยาบาลส่งเวร (Nurse A)
    participant UI as 📱 Bed Management UI
    participant ShareSvc as 📤 Handover Share Service
    participant DB as 💾 Bed & Handover DB
    participant Clipboard as 📋 OS Clipboard / LINE App
    actor NurseB as 👩‍⚕️ พยาบาลรับเวร (Nurse B / Peer)

    NurseA->>UI: 1. กดปุ่ม "แชร์สรุปเตียงนี้ให้เพื่อน" (Share Bed)
    UI->>ShareSvc: 2. Request สรุปข้อมูลเตียง (BedId, CurrentShift)
    ShareSvc->>DB: 3. ดึงประวัติคนไข้ + สัญญาณชีพ + ยาเสี่ยงสูง + SBAR ล่าสุด
    DB-->>ShareSvc: 4. ข้อมูลครบถ้วน
    
    ShareSvc->>ShareSvc: 5. 🛡️ จัดรูปแบบข้อความ Clean ข้อความตาม PDPA (ไม่มีชื่อ/HN)
    ShareSvc-->>UI: 6. ข้อความจัดฟอร์แมตสำเร็จ (Markdown / Plaintext)
    
    UI->>Clipboard: 7. คัดลอกลง Clipboard หรือเรียก LINE URL Scheme
    Clipboard-->>NurseA: 8. แสดงแจ้งเตือน "คัดลอกข้อความส่งเวรเรียบร้อย!"
    
    NurseA->>NurseB: 9. วางข้อความส่งในห้องแชท LINE เวรพยาบาล
    NurseB-->>NurseB: 10. อ่านสรุปเตรียมรับช่วงดูแลต่อได้ทันที
```

---

### Flow 3: การแชร์เกร็ดความรู้จากรุ่นพี่ ➡️ แปลงเป็นโจทย์ควิซ ➡️ รุ่นน้องฝึกทำข้อสอบ

```mermaid
sequenceDiagram
    autonumber
    actor Senior as 👩‍⚕️ พยาบาลรุ่นพี่ (Senior Nurse)
    participant UI_Senior as 📱 Senior Portal UI
    participant PearlSvc as 💡 Pearls Service
    participant QuizEngine as 🎯 Quiz Quest Engine
    participant DB as 💾 Pearls & Quiz DB
    actor Junior as 👩‍⚕️ พยาบาลรุ่นน้อง (Junior Nurse)
    participant UI_Junior as 📱 Junior Feed & Quiz UI

    Senior->>UI_Senior: 1. เขียนทริค "การระวังความดันตกตอนดริป NTG"
    UI_Senior->>PearlSvc: 2. ส่งเนื้อหาเกร็ดความรู้ + หมวดหมู่ (High Alert Drug)
    PearlSvc->>DB: 3. บันทึกเกร็ดความรู้ลงคลังวอร์ด
    
    PearlSvc->>QuizEngine: 4. ส่ง Trigger สร้างข้อสอบจากเกร็ดความรู้นี้
    QuizEngine->>QuizEngine: 5. AI สกัดเป็นคำถาม Multiple Choice 4 ตัวเลือก
    QuizEngine->>DB: 6. บันทึกชุดข้อสอบลงธนาคารควิซ (Quiz Bank)

    Note over Junior, UI_Junior: ในเวลาว่างระหว่างเวร
    Junior->>UI_Junior: 7. เปิดอ่าน "เกร็ดความรู้ประจำวันจากพี่ๆ"
    UI_Junior->>DB: 8. ดึงทริคของรุ่นพี่มาแสดง
    DB-->>UI_Junior: 9. แสดงการ์ดทริค NTG
    Junior->>UI_Junior: 10. แตะปุ่ม "ส่งหัวใจขอบคุณพี่ ❤️"
    UI_Junior->>DB: 11. อัปเดตยอด Reaction ให้รุ่นพี่

    Junior->>UI_Junior: 12. กดเริ่มเล่นเกมควิซทบทวน (Daily Quiz)
    UI_Junior->>QuizEngine: 13. ดึงคำถามที่สร้างจากทริค NTG
    QuizEngine-->>UI_Junior: 14. แสดงโจทย์และตัวเลือก
    Junior->>UI_Junior: 15. เลือกคำตอบ
    UI_Junior->>QuizEngine: 16. ส่งคำตอบตรวจ
    QuizEngine-->>UI_Junior: 17. เฉลยพร้อมคำอธิบายให้กำลังใจ + มอบแต้ม 50 EXP
    UI_Junior-->>Junior: 18. เลเวลพยาบาลอัปเกรด มั่นใจขึ้น!
```

