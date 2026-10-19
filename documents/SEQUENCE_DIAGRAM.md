# แผนภาพลำดับขั้นตอนการทำงาน (Sequence Diagram)
## โครงการ: The Note Nurse (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้แสดงลำดับการส่งข้อมูลระหว่างวัตถุ (Sequence of Interactions) ใน 3 กระบวนการหลักของระบบ:
1. **Flow 1: การบันทึกเสียง ➡️ กรอง PDPA ➡️ สร้างรายงาน SBAR + Cheat Sheet ดักคำถาม**
2. **Flow 2: การแชร์สรุปข้อมูลเตียงคนไข้ให้เพื่อน (Handover Sharing via LINE / Clipboard)**
3. **Flow 3: การเผยแพร่เกร็ดความรู้จากรุ่นพี่ ➡️ แปลงเป็นโจทย์ควิซ ➡️ รุ่นน้องฝึกทำข้อสอบ**

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

