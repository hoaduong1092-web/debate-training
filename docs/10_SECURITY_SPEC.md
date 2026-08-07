# 10_SECURITY_SPEC.md

# AI Debate Master — Thinking OS
## Security & Privacy Specification
### Version 3.0.0

---

## 1. Document Purpose & Scope

### 1.1. Purpose

Tài liệu này đặc tả các yêu cầu về **Security & Privacy** của AI Debate Master — Thinking OS.

Tài liệu đối chiếu trực tiếp với:

- **Blueprint v3.0.0 — Section 16: Security & Privacy**
- **Blueprint v3.0.0 — Section 05: Domain Architecture**
- Các nội dung liên quan trong **Section 07: Database Design**
- Các yêu cầu kiểm thử an toàn trong **Section 19: Testing Strategy**

Source of Truth duy nhất:

    ai-debate-master-blueprint-v3.pdf
    Version 3.0.0

Mục tiêu của Security & Privacy Framework là bảo vệ dữ liệu người dùng, đặc biệt là dữ liệu của học sinh dưới 15 tuổi, đồng thời tạo môi trường AI an toàn phù hợp với đối tượng học sinh.

---

# 2. Security & Privacy Principles

## 2.1. Child-First Privacy

Blueprint xác định học sinh dưới 15 tuổi là nhóm người dùng cần được bảo vệ đặc biệt.

Hệ thống phải thiết lập hàng rào bảo mật nghiêm ngặt đối với dữ liệu của nhóm người dùng này.

Blueprint dẫn chiếu các yêu cầu bảo vệ theo:

- COPPA;
- Luật Trẻ em Việt Nam.

Yêu cầu cốt lõi:

    Child Data Protection = Highest Security Priority

---

## 2.2. Data Minimization

Blueprint yêu cầu giảm thiểu dữ liệu cá nhân trực tiếp được thu thập từ học sinh.

Cụ thể, hệ thống sử dụng cơ chế:

    Apple Sign-In

và không yêu cầu hoặc lưu trữ trực tiếp:

- số điện thoại;
- email của học sinh.

Mục tiêu là giảm thiểu rủi ro rò rỉ dữ liệu cá nhân của trẻ vị thành niên.

---

# 3. Authentication & Identity

## 3.1. Core Authentication Mechanism

**Apple Sign-In** là cơ chế định danh/đăng nhập cốt lõi được Blueprint quy định cho hệ thống.

Auth Domain chịu trách nhiệm:

- Apple Login;
- Delete Account.

Blueprint Section 05 mô tả Auth Domain với hai chức năng cốt lõi:

    Apple Login
    Delete Account

---

## 3.2. Apple Identity

Database Design của Blueprint quy định bảng `users` có trường:

    id UUID (PK)
    apple_id VARCHAR(255)
    display_name VARCHAR(100)
    selected_lang VARCHAR(10)
    tier VARCHAR(20)
    created_at TIMESTAMP

Trong đó:

    apple_id

là ID định danh duy nhất từ Apple Sign-In.

Authentication API được Blueprint quy định:

    POST /api/v1/auth/apple

Mô tả:

    Xác thực người dùng bằng Apple Identity Token.
    Trả về JWT Access Token và thông tin phân quyền tài khoản người dùng.

---

## 3.3. Direct Contact Data

Theo Blueprint:

Hệ thống không lưu trữ hoặc yêu cầu học sinh cung cấp trực tiếp:

- số điện thoại;
- email.

Mục tiêu:

    Minimize Personally Identifiable Information
    ↓
    Reduce child-data exposure risk

Chi tiết về các trường dữ liệu khác ngoài những trường được Blueprint nêu:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ danh mục PII/Personal Data được phép lưu trữ ngoài các trường đã nêu trong Database Design.

---

# 4. Account Deletion

## 4.1. Mandatory Delete Account Function

Chức năng **Delete Account** là yêu cầu bắt buộc của Auth Domain.

Blueprint Section 05 quy định:

    Auth Domain
        ├── Apple Login
        └── Delete Account

Người dùng phải có thể truy cập chức năng **Xóa tài khoản** trực tiếp từ menu cài đặt.

---

## 4.2. Settings Menu Requirement

UI phải cung cấp:

    Settings
        ↓
    Delete Account

Nút/chức năng Delete Account phải được tích hợp trực tiếp tại menu cài đặt.

Mục tiêu là đáp ứng yêu cầu bảo vệ quyền riêng tư được Blueprint xác định.

---

## 4.3. Deletion Workflow

Blueprint xác định sự tồn tại của chức năng Delete Account nhưng chưa mô tả đầy đủ workflow kỹ thuật phía sau.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết quy trình xử lý backend sau khi người dùng yêu cầu Delete Account.

Các nội dung chưa được Blueprint xác định cụ thể bao gồm:

- thứ tự xóa dữ liệu;
- dữ liệu nào phải xóa;
- dữ liệu nào được giữ lại;
- thời gian hoàn tất việc xóa;
- cơ chế xác nhận trước khi xóa;
- cơ chế xử lý dữ liệu đã lưu trên Object Storage;
- cơ chế xử lý dữ liệu đã chuyển Storage Tier;
- cơ chế audit việc xóa;
- cơ chế phục hồi sau khi xóa.

Không được tự suy diễn các behavior trên khi chưa có đặc tả chính thức.

---

# 5. Child Data Protection

## 5.1. Core Requirement

**Bảo vệ dữ liệu của trẻ em dưới 15 tuổi là yêu cầu bảo mật cốt lõi của hệ thống.**

Blueprint xác định đối tượng người dùng trọng tâm bao gồm học sinh dưới 15 tuổi và yêu cầu hàng rào bảo mật nghiêm ngặt.

Nguyên tắc:

    Child < 15
        ↓
    Enhanced Privacy Protection
        ↓
    Minimize Personal Data
        ↓
    Safe AI Environment

---

## 5.2. Anonymous Apple Sign-In

Để giảm rủi ro dữ liệu cá nhân:

    Apple Sign-In
        ↓
    Anonymous / privacy-oriented identity
        ↓
    No direct phone requirement
    No direct email requirement

Theo Blueprint, cơ chế này nhằm giảm thiểu tối đa rủi ro rò rỉ dữ liệu cá nhân của trẻ vị thành niên.

---

## 5.3. Child Safe Space

Hệ thống phải cung cấp môi trường AI an toàn cho học sinh.

Blueprint quy định:

- kho chủ đề kiến nghị;
- dẫn chứng khoa học;
- kịch bản đối luyện AI

được đội ngũ chuyên môn kiểm duyệt trước.

Mục tiêu:

    Curated Content
        +
    Safety Filters
        =
    Safe Learning Environment

---

## 5.4. Parental Control Portal

Blueprint cũng quy định:

    Parental Control Portal

Portal này cung cấp tài khoản giám sát dành cho cha mẹ được liên kết với con em mình.

Theo Blueprint, phụ huynh có thể:

- xem lịch sử đấu luyện;
- xem biểu đồ năng lực tư duy của con;
- quản lý thời gian sử dụng ứng dụng mỗi ngày.

Mục tiêu là hỗ trợ phụ huynh đồng hành và hạn chế việc trẻ lạm dụng công nghệ số.

---

## 5.5. Parental Consent

Blueprint có đề cập tới:

    Parental Control Portal

nhưng chưa đặc tả đầy đủ cơ chế **parental consent**.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả workflow xác minh và ghi nhận sự đồng ý của phụ huynh đối với người dùng dưới độ tuổi cần parental consent.

Không được tự suy diễn:

- phương thức xác minh phụ huynh;
- loại giấy tờ xác minh;
- email/SMS verification;
- consent token;
- consent expiration;
- consent withdrawal;
- consent audit workflow.

---

# 6. Safety Filters

## 6.1. Mandatory Safety Filters

Blueprint quy định AI phải được cấu hình:

    Safety Filters

Safety Filters phải ngăn chặn hoàn toàn các thông tin:

- độc hại;
- nhạy cảm;
- không phù hợp với lứa tuổi.

Đây là thành phần bắt buộc của Safe Space.

---

## 6.2. Protected Content Categories

Theo yêu cầu kiểm thử Prompt Red-Teaming trong Blueprint Section 19, hệ thống phải kiểm thử khả năng ngăn AI đưa ra:

- thông tin sai lệch;
- quan điểm lệch lạc về chính trị;
- quan điểm lệch lạc về tôn giáo;
- ngôn từ bạo lực.

Mục tiêu an toàn được Blueprint xác định:

    100% safety rate

---

## 6.3. Safety Boundary

AI Coach không được trở thành nguồn cung cấp nội dung nguy hiểm hoặc không phù hợp với đối tượng học sinh.

Mô hình bảo vệ:

    User Input
        ↓
    Safety Filtering
        ↓
    AI Coach
        ↓
    Safety Validation
        ↓
    User Output

Chi tiết implementation của pipeline trên:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết kiến trúc runtime của Safety Filter trước/sau LLM.

Không được tự suy diễn số lượng tầng filter hoặc vị trí triển khai cụ thể.

---

# 7. AI Safety & Red-Teaming

## 7.1. Red-Teaming Requirement

Blueprint Section 19 yêu cầu thực hiện:

    Prompt Red-Teaming

Mục tiêu là xây dựng các kịch bản tấn công nhằm tìm cách:

- jailbreak AI Coach;
- khiến AI đưa ra thông tin sai lệch;
- khiến AI đưa ra quan điểm lệch lạc về chính trị;
- khiến AI đưa ra quan điểm lệch lạc về tôn giáo;
- khiến AI sử dụng ngôn từ bạo lực.

---

## 7.2. Safety Target

Sau quá trình kiểm thử và hiệu chỉnh prompt:

    Target Safety Rate = 100%

Đây là mục tiêu an toàn được Blueprint xác định.

---

## 7.3. Red-Team Scope

Red-Teaming phải tập trung vào các trường hợp:

    Jailbreak
    Misinformation
    Political bias / unsafe political content
    Religious bias / unsafe religious content
    Violent language

Kết quả Red-Teaming phải được sử dụng để hiệu chỉnh hệ thống prompt nhằm nâng mức an toàn.

---

## 7.4. Safety Test Specification Gap

Blueprint xác định mục tiêu 100% nhưng chưa cung cấp đầy đủ test protocol.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả test case catalog, dataset, pass/fail criteria chi tiết, sampling methodology và cách tính chính xác "100% safety rate".

Không được tự định nghĩa các tiêu chí này trong Security Specification.

---

# 8. Content Moderation

## 8.1. Pre-Moderated Learning Content

Blueprint yêu cầu kho nội dung phục vụ học tập được đội ngũ chuyên môn kiểm duyệt trước.

Phạm vi bao gồm:

- debate topics;
- scientific evidence;
- AI sparring scripts.

Mục tiêu:

    Pre-moderated content
        ↓
    Safe learning material

---

## 8.2. AI-Generated Content

AI-generated content phải chịu sự kiểm soát của Safety Filters.

Mục tiêu là ngăn chặn:

- harmful information;
- sensitive information;
- age-inappropriate information.

---

# 9. Data Model Security Considerations

## 9.1. User Identity

Blueprint Database Design xác định:

    users.id
    users.apple_id
    users.display_name
    users.selected_lang
    users.tier
    users.created_at

`apple_id` là định danh duy nhất từ Apple Sign-In.

---

## 9.2. Debate Data

Blueprint cũng lưu trữ dữ liệu Debate có liên kết với user:

    debate_sessions.user_id

Các dữ liệu Debate bao gồm thông tin phiên đấu luyện và các kết quả liên quan.

Bảng `debate_transcripts` có:

    session_id
    speaker_type
    turn_number
    text_content
    audio_path
    fallacies_detected
    evidence_star

Do đây là dữ liệu liên quan đến hoạt động học tập của người dùng, việc bảo vệ dữ liệu này phải tuân thủ nguyên tắc bảo vệ dữ liệu người dùng và trẻ em được Blueprint đặt ra.

Chi tiết encryption/access-control cho từng trường:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết security classification và access-control matrix cho từng loại Debate Data.

---

# 10. Encryption

Blueprint xác định yêu cầu bảo mật dữ liệu nhưng không cung cấp chuẩn kỹ thuật mã hóa cụ thể.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chuẩn mã hóa Database at Rest.

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chuẩn mã hóa dữ liệu khi truyền tải In Transit.

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả thuật toán, key size, key management, key rotation hoặc secret management.

Không được tự suy diễn việc sử dụng một thuật toán hoặc tiêu chuẩn mã hóa cụ thể.

---

# 11. Access Control

Hệ thống có khái niệm:

- User;
- Apple Identity;
- JWT Access Token;
- thông tin phân quyền tài khoản.

API:

    POST /api/v1/auth/apple

trả về:

    JWT Access Token
    +
    Account Authorization Information

Chi tiết authorization model:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ RBAC/ABAC model, permission matrix và authorization policy cho từng Domain/API.

---

# 12. Parent–Child Data Boundary

Parental Control Portal tạo ra quan hệ:

    Parent
       ↕
    Child

Theo Blueprint, phụ huynh có thể truy cập:

- lịch sử đấu luyện;
- biểu đồ năng lực tư duy;
- thời gian sử dụng ứng dụng.

Việc xác định chính xác:

- parent identity;
- child identity;
- relationship verification;
- access scope;
- revocation;

chưa được Blueprint đặc tả chi tiết.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết Parent–Child identity linking và authorization workflow.

---

# 13. Data Retention & Deletion

Blueprint có quy định Storage Tier trong Section 17:

    Hot: 0–30 ngày
        Full data

    Warm: 31–180 ngày
        Compressed audio + transcript

    Cold: >180 ngày
        Score + Thinking DNA

Security Specification phải tuân thủ Storage Tier policy này.

Tuy nhiên, Storage Tier policy không thay thế Delete Account policy.

---

## 13.1. Account Deletion vs Storage Retention

Khi người dùng thực hiện Delete Account, Blueprint yêu cầu có chức năng Delete Account nhưng chưa mô tả chính xác cách xử lý dữ liệu theo từng Storage Tier.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chính sách Data Retention chi tiết sau khi user xóa tài khoản.

Các vấn đề chưa được đặc tả:

- dữ liệu Hot;
- dữ liệu Warm;
- dữ liệu Cold;
- Audio;
- Transcript;
- Score;
- Thinking DNA;
- AI Analysis JSON;
- Parent–Child relationship;
- audit records;
- backup copies.

---

# 14. Security API Boundary

Các API liên quan trực tiếp tới Security/Identity được Blueprint xác định gồm:

    POST /api/v1/auth/apple

và chức năng:

    Delete Account

API contract chi tiết cho Delete Account:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả endpoint, HTTP method, request payload, response schema, authentication requirement và error model cho Delete Account.

---

# 15. Security Logging & Audit

Blueprint chưa đặc tả rõ một Security Audit Log riêng cho:

- Login;
- Failed Login;
- Delete Account;
- Parental Consent;
- Parent–Child linking;
- Safety Filter event;
- Red-Team event.

Do đó:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả Security Audit Logging requirements.

Không được tự bổ sung audit schema hoặc retention policy nếu chưa có đặc tả chính thức.

---

# 16. Security Spec Gaps

Các khoảng trống đặc tả được xác định trực tiếp từ Blueprint:

## GAP-SEC-001 — Age Verification

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả quy trình xác minh tuổi/Age Verification.

## GAP-SEC-002 — Parental Consent

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả workflow Consent của phụ huynh.

## GAP-SEC-003 — Parent–Child Linking

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả cơ chế xác minh và liên kết tài khoản phụ huynh với trẻ.

## GAP-SEC-004 — Encryption at Rest

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chuẩn mã hóa Database/Object Storage khi lưu trữ.

## GAP-SEC-005 — Encryption in Transit

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chuẩn mã hóa dữ liệu khi truyền tải.

## GAP-SEC-006 — Key Management

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả key management, key rotation và secret management.

## GAP-SEC-007 — Delete Account Workflow

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả workflow kỹ thuật đầy đủ của Delete Account.

## GAP-SEC-008 — Delete Data Scope

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chính xác dữ liệu nào phải xóa khi Delete Account.

## GAP-SEC-009 — Data Retention After Deletion

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả Data Retention Policy sau khi user xóa tài khoản.

## GAP-SEC-010 — Backup Deletion

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả cách xử lý dữ liệu trong backup sau Delete Account.

## GAP-SEC-011 — Authorization Matrix

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ authorization matrix cho User, Parent và các Domain.

## GAP-SEC-012 — Safety Filter Architecture

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả vị trí và kiến trúc runtime cụ thể của Safety Filters.

## GAP-SEC-013 — Safety Test Protocol

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả test protocol chi tiết để chứng minh mục tiêu 100% safety rate.

## GAP-SEC-014 — Security Audit Log

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả Security Audit Logging requirements.

## GAP-SEC-015 — PII Data Inventory

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ danh mục PII và dữ liệu nhạy cảm được phép lưu trữ.

## GAP-SEC-016 — Child Data Classification

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả data classification matrix riêng cho dữ liệu của trẻ dưới 15 tuổi.

## GAP-SEC-017 — Consent Withdrawal

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả cơ chế rút lại parental consent.

## GAP-SEC-018 — Account Deletion Confirmation

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả cơ chế xác nhận Delete Account và các bước xác nhận liên quan.

---

# 17. Compliance Checklist

| ID | Requirement | Blueprint Reference | Status |
|---|---|---|---|
| SEC-001 | Security & Privacy Framework | Section 16 | COMPLIANT |
| SEC-002 | Auth Domain exists | Section 05 | COMPLIANT |
| SEC-003 | Apple Sign-In as core login/identity mechanism | Section 05 / Section 16 | COMPLIANT |
| SEC-004 | Apple Identity Token authentication API | Section 08 | COMPLIANT |
| SEC-005 | Do not directly require/store child phone number | Section 16 | COMPLIANT |
| SEC-006 | Do not directly require/store child email | Section 16 | COMPLIANT |
| SEC-007 | Delete Account function exists | Section 05 | COMPLIANT |
| SEC-008 | Delete Account accessible from Settings | Section 05 | COMPLIANT |
| SEC-009 | Special protection for children under 15 | Section 16 | COMPLIANT |
| SEC-010 | Pre-moderated debate topics | Section 16 | COMPLIANT |
| SEC-011 | Pre-moderated scientific evidence | Section 16 | COMPLIANT |
| SEC-012 | Pre-moderated AI sparring scripts | Section 16 | COMPLIANT |
| SEC-013 | Safety Filters | Section 16 | COMPLIANT |
| SEC-014 | Block harmful/age-inappropriate content | Section 16 | COMPLIANT |
| SEC-015 | Parental Control Portal | Section 16 | COMPLIANT |
| SEC-016 | Parent can view debate history | Section 16 | COMPLIANT |
| SEC-017 | Parent can view Thinking capability chart | Section 16 | COMPLIANT |
| SEC-018 | Parent can manage daily usage time | Section 16 | COMPLIANT |
| SEC-019 | Prompt Red-Teaming | Section 19 | COMPLIANT |
| SEC-020 | Test misinformation safety | Section 19 | COMPLIANT |
| SEC-021 | Test political-content safety | Section 19 | COMPLIANT |
| SEC-022 | Test religious-content safety | Section 19 | COMPLIANT |
| SEC-023 | Test violent-language safety | Section 19 | COMPLIANT |
| SEC-024 | Safety target 100% | Section 19 | COMPLIANT |
| SEC-025 | Age Verification workflow | Not specified | SPEC GAP |
| SEC-026 | Parental Consent workflow | Not specified | SPEC GAP |
| SEC-027 | Parent–Child verification | Not specified | SPEC GAP |
| SEC-028 | Database encryption standard | Not specified | SPEC GAP |
| SEC-029 | Transit encryption standard | Not specified | SPEC GAP |
| SEC-030 | Key management | Not specified | SPEC GAP |
| SEC-031 | Detailed Delete Account workflow | Not specified | SPEC GAP |
| SEC-032 | Data retention after account deletion | Not specified | SPEC GAP |
| SEC-033 | Backup deletion policy | Not specified | SPEC GAP |
| SEC-034 | Detailed authorization matrix | Not specified | SPEC GAP |
| SEC-035 | Safety Filter runtime architecture | Not specified | SPEC GAP |
| SEC-036 | Detailed safety test protocol | Not specified | SPEC GAP |
| SEC-037 | Security audit logging | Not specified | SPEC GAP |
| SEC-038 | Complete PII inventory | Not specified | SPEC GAP |

---

# 18. Non-Invention Rule

Security implementation MUST NOT invent requirements that are absent from Blueprint v3.0.0.

Đặc biệt không được tự ý bổ sung:

- phương thức xác minh tuổi;
- parental consent mechanism;
- encryption algorithm;
- encryption key size;
- key rotation policy;
- retention period ngoài Storage Tier đã quy định;
- deletion workflow;
- backup deletion policy;
- RBAC matrix;
- security audit schema;
- safety filter architecture;
- safety threshold ngoài mục tiêu 100% được Blueprint xác định.

Mọi yêu cầu kỹ thuật chưa được Blueprint đặc tả phải được ghi:

    SPEC GAP: [Nội dung thiếu]

---

# 19. Critical Security Rules

## Rule 1 — Apple Sign-In

Apple Sign-In là cơ chế định danh cốt lõi được Blueprint quy định.

## Rule 2 — Minimize Child PII

Không yêu cầu hoặc lưu trữ trực tiếp số điện thoại/email của học sinh theo yêu cầu Blueprint.

## Rule 3 — Delete Account

Delete Account là chức năng bắt buộc và phải xuất hiện trực tiếp trong Settings.

## Rule 4 — Child Protection

Dữ liệu của trẻ dưới 15 tuổi phải được bảo vệ ở mức cao nhất theo Security & Privacy Framework.

## Rule 5 — Safe Space

Nội dung học tập được kiểm duyệt trước và AI phải có Safety Filters.

## Rule 6 — Safety Filters

Safety Filters phải ngăn nội dung độc hại, nhạy cảm và không phù hợp với lứa tuổi.

## Rule 7 — Red-Team

Hệ thống phải được kiểm thử jailbreak/red-team đối với misinformation, political content, religious content và violent language.

## Rule 8 — 100% Safety Target

Mục tiêu an toàn được Blueprint xác định là 100%.

## Rule 9 — Parent Control

Parental Control Portal phải hỗ trợ chức năng giám sát được Blueprint quy định.

## Rule 10 — No Spec Invention

Không được tự suy diễn các chi tiết kỹ thuật chưa được Blueprint đặc tả.

---

# 20. Document Status

**Document:** 10_SECURITY_SPEC.md

**Project:** AI Debate Master — Thinking OS

**Blueprint Version:** 3.0.0

**Primary Blueprint Sections:**

    Section 16 — Security & Privacy
    Section 05 — Domain Architecture

**Related Blueprint Sections:**

    Section 07 — Database Design
    Section 08 — API Specification
    Section 17 — Deployment Architecture
    Section 19 — Testing Strategy

**Status:** SPECIFICATION — BLUEPRINT ALIGNED

**Implementation Status:** NOT IMPLEMENTED BY THIS DOCUMENT

**Source of Truth:**

    ai-debate-master-blueprint-v3.pdf

**Critical Security Principle:**

    Protect child data first.
    Minimize personal data.
    Use Apple Sign-In.
    Provide Delete Account.
    Maintain a Safe Space.
    Apply Safety Filters.
    Red-Team the AI.
    Target 100% safety.

**Critical Specification Principle:**

    Blueprint v3.0.0 is authoritative.

    Where Blueprint v3.0.0 does not provide sufficient detail:
    
        SPEC GAP: [Nội dung thiếu]

    No security, privacy, authentication, consent, encryption,
    retention, deletion, authorization or safety behavior may be
    invented outside the authoritative Blueprint.