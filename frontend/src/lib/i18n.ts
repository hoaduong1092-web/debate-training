export type Language = 'vi' | 'en';

export interface Strings {
  headerTitle: string;
  headerSubtitle: string;
  subscribeCta: string;
  languageLabel: string;
  sparringTitle: string;
  you: string;
  versus: string;
  opponent: string;
  chooseCharacter: string;
  sonTung: string;
  hoaMinzy: string;
  sideLabel: string;
  affirmative: string;
  negative: string;
  audioMode: string;
  voiceMode: string;
  textMode: string;
  topicLabel: string;
  topicPlaceholder: string;
  startDebate: string;
  speechDraft: string;
  topicReport: string;
  suggestedTopics: string;
  navArena: string;
  navHistory: string;
  navPlaza: string;
  navProfile: string;
  navAssistant: string;
  workspaceTitle: string;
  yourArgumentLabel: string;
  yourArgumentPlaceholder: string;
  submit: string;
  submitting: string;
  loading: string;
  networkError: string;
  serverError: string;
  tryAgain: string;
  coachFeedback: string;
  overallScore: string;
  claim: string;
  reasoning: string;
  evidence: string;
  fallacies: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  noFeedbackYet: string;
  telemetry: string;
  tokens: string;
  inputTokens: string;
  outputTokens: string;
  executionMs: string;
  turnLabel: string;
  scoreImproved: string;
  scoreNeedsImprovement: string;
  notAvailable: string;
  assistantPlaceholder: string;
  assistantUnavailable: string;
  topicRequired: string;
  backToSetup: string;
  newDebate: string;
  // ── End Session ──
  endSession: string;
  endSessionConfirmTitle: string;
  endSessionConfirmBody: string;
  endSessionConfirm: string;
  endSessionCancel: string;
  endSessionSummaryTitle: string;
  endSessionSummaryTurns: string;
  endSessionSummaryAvgScore: string;
  endSessionSummaryBestScore: string;
  endSessionViewHistory: string;
  endSessionNewDebate: string;
  endSessionCompleting: string;
  // ── History Screen ──
  historyTitle: string;
  historyEmpty: string;
  historyLoadError: string;
  historyTurns: string;
  historyStatus: string;
  historyStatusInProgress: string;
  historyStatusCompleted: string;
  historySide: string;
  historyViewDetail: string;
  historyDetailTitle: string;
  historyDetailYou: string;
  historyDetailOpponent: string;
  historyDetailClose: string;
  historyEvidenceStar: string;
  historyFallacies: string;
  historyDebatedOn: string;
  historyDelete: string;
  historyDeleteConfirm: string;
  historyDeleting: string;
  historyManage: string;
  historySelectAll: string;
  historyDeselectAll: string;
  historyDeleteSelected: string;
  historyDeleteAll: string;
  historyDeleteAllConfirm: string;
  historyBulkDeleting: string;
  historyCancelSelect: string;
  historyDeleteSelectedConfirm: string;
  // ── Replay Engine ──
  replayEngine: string;
  replayTimeline: string;
  replaySingleTurn: string;
  replayAllTurns: string;
  replayPrevTurn: string;
  replayNextTurn: string;
  replayNoTurns: string;
  replayVoiceTitle: string;
  replayLogicTitle: string;
  replayListenOpponent: string;
  replayEvidenceRating: string;
  replayFallaciesDetected: string;
  replayNoFallacies: string;
  replayWpm: string;
  replayWpmNormal: string;
  replayWpmFast: string;
  replayWpmSlow: string;
  replayDuration: string;
  replayFillers: string;
  replaySearchPlaceholder: string;
  subscribeTitle: string;
  subscribeSubtitle: string;
  subscribeClose: string;
  subscribePlanFree: string;
  subscribePlanStandard: string;
  subscribePlanPremium: string;
  subscribeContact: string;
  // ── Plaza Domain ──
  plazaTitle: string;
  plazaSubtitle: string;
  plazaLatest: string;
  plazaPopular: string;
  plazaSearchPlaceholder: string;
  plazaEmpty: string;
  plazaNoResults: string;
  plazaLoading: string;
  plazaLoadError: string;
  plazaScore: string;
  plazaTurns: string;
  plazaLike: string;
  plazaFavorite: string;
  plazaViews: string;
  plazaStudy: string;
  plazaClose: string;
  plazaLearningViewTitle: string;
  plazaTranscript: string;
  plazaCreTitle: string;
  plazaClaim: string;
  plazaReasoning: string;
  plazaEvidence: string;
  plazaCoachEval: string;
  plazaStrengths: string;
  plazaWeaknesses: string;
  plazaSuggestions: string;
  plazaFallacies: string;
  plazaNoFallacies: string;
  plazaYou: string;
  plazaOpponent: string;
  plazaAffirmative: string;
  plazaNegative: string;
  plazaContentScore: string;
  plazaStyleScore: string;
  plazaStrategyScore: string;
  plazaEvidenceStar: string;
  plazaNoCoachFeedback: string;
  plazaHighlightQuote: string;
  plazaSonTung: string;
  plazaHoaMinzy: string;
  // ── Profile & Subscription Domain ──
  profileTitle: string;
  profileSubtitle: string;
  profileName: string;
  profileRole: string;
  profileMemberSince: string;
  profileLanguageSwitch: string;
  profileSaveChanges: string;
  profileSaving: string;
  profileSaved: string;
  profileSaveError: string;
  profileNoSubscription: string;
  profileSubscriptionExpired: string;
  profileCurrentPlan: string;
  profileCycleEnds: string;
  profileQuotaDashboard: string;
  profileTextDebate: string;
  profileVoiceDebate: string;
  profileAssistantCredits: string;
  profileRemaining: string;
  profileSessionsLeft: string;
  profileMinutesLeft: string;
  profileCreditsLeft: string;
  profileUpgradePlan: string;
  profileChoosePlan: string;
  profilePlanCompetition: string;
  profilePlanBasic: string;
  profilePlanStandard: string;
  profilePlanPremium: string;
  profilePer7Days: string;
  profilePerMonth: string;
  profileSelectPlan: string;
  profileCurrentBadge: string;
  profileCreditPacksTitle: string;
  profileCreditPacksSubtitle: string;
  profileBuyPack: string;
  profileActivePacks: string;
  profilePackExpires: string;
  profileGranularSub: string;
  profileGranularPack: string;
  profileMyDebates: string;
  profileCompletedDebates: string;
  profileTotalDebates: string;
  profileSavedFavorites: string;
  profileGoToPlaza: string;
  profileLoadError: string;
  profileLoading: string;
  paymentModalTitle: string;
  paymentOrderSummary: string;
  paymentItem: string;
  paymentTotalAmount: string;
  paymentMethod: string;
  paymentQrInstruction: string;
  paymentSimulateSuccess: string;
  paymentSandboxDirect: string;
  paymentProcessing: string;
  paymentSuccessTitle: string;
  paymentSuccessMsg: string;
  paymentClose: string;
  paymentCancel: string;
  paymentMethodSepay: string;
  paymentMethodVnpay: string;
  paymentMethodMomo: string;
  paymentMethodSandbox: string;
  paymentOpenGateway: string;
  paymentBankName: string;
  paymentAccountNumber: string;
  paymentAccountName: string;
  paymentTransferMemo: string;
  paymentCopy: string;
  paymentCopied: string;
  paymentAutoConfirmNotice: string;
  // ── Team Pass & School Bundles ──
  teamBundlesTitle: string;
  teamBundlesSubtitle: string;
  team3Sprint: string;
  team3Standard: string;
  team5Wsdc: string;
  school10Standard: string;
  teamRedeemCardTitle: string;
  teamRedeemCardSubtitle: string;
  teamRedeemBtn: string;
  teamRedeemModalTitle: string;
  teamRedeemInputPlaceholder: string;
  teamRedeeming: string;
  teamRedeemSuccess: string;
  teamMyTeamsTitle: string;
  teamSeatsLabel: string;
  teamLeaderLabel: string;
  teamMemberLabel: string;
  teamSeatVacant: string;
  teamInviteCodeLabel: string;
  teamCopyCode: string;
  teamCodeCopied: string;
  teamSeatsActivated: string;
}


const vi: Strings = {
  headerTitle: 'Bậc thầy tranh luận AI',
  headerSubtitle: 'Đấu luyện tư duy phản biện cùng AI Coach',
  subscribeCta: 'Đăng ký ngay',
  languageLabel: 'Ngôn ngữ',
  sparringTitle: 'Đấu luyện AI',
  you: 'Bạn',
  versus: 'VS',
  opponent: 'Đối thủ AI',
  chooseCharacter: 'Chọn nhân vật đối thủ',
  sonTung: 'Sơn Tùng',
  hoaMinzy: 'Hòa Minzy',
  sideLabel: 'Chọn phe tranh luận',
  affirmative: 'Ủng hộ',
  negative: 'Phản đối',
  audioMode: 'Chế độ âm thanh',
  voiceMode: 'Giọng nói',
  textMode: 'Văn bản',
  topicLabel: 'Nhập chủ đề tranh luận',
  topicPlaceholder: 'Ví dụ: Mạng xã hội có nên cấm với học sinh dưới 15 tuổi?',
  startDebate: 'Bắt đầu tranh luận',
  speechDraft: 'Tạo bản thảo bài phát biểu tranh luận',
  topicReport: 'Tạo báo cáo phân tích chủ đề tranh luận',
  suggestedTopics: 'Chủ đề gợi ý',
  navArena: 'Tranh luận',
  navHistory: 'Lịch sử',
  navPlaza: 'Quảng trường',
  navProfile: 'Của tôi',
  navAssistant: 'Trợ lý',
  workspaceTitle: 'Không gian tranh luận',
  yourArgumentLabel: 'Lập luận của bạn',
  yourArgumentPlaceholder: 'Trình bày Claim, Reasoning và Evidence của bạn...',
  submit: 'Gửi lập luận',
  submitting: 'Đang phân tích...',
  loading: 'Đang tải...',
  networkError: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
  serverError: 'Máy chủ trả về lỗi',
  tryAgain: 'Thử lại',
  coachFeedback: 'Phản hồi trực tiếp từ Coach',
  overallScore: 'Điểm tổng',
  claim: 'Luận điểm',
  reasoning: 'Lập luận',
  evidence: 'Dẫn chứng',
  fallacies: 'Ngụy biện phát hiện',
  strengths: 'Điểm mạnh',
  weaknesses: 'Điểm yếu',
  suggestions: 'Gợi ý cải thiện',
  noFeedbackYet: 'Chưa có phản hồi. Hãy gửi lập luận đầu tiên của bạn.',
  telemetry: 'Telemetry',
  tokens: 'Token',
  inputTokens: 'Input',
  outputTokens: 'Output',
  executionMs: 'Thời gian xử lý',
  turnLabel: 'Lượt',
  scoreImproved: '↑ Tiến bộ',
  scoreNeedsImprovement: '↓ Cần cải thiện',
  notAvailable: 'N/A',
  assistantPlaceholder: 'Tính năng Assistant sẽ được triển khai ở giai đoạn sau.',
  assistantUnavailable: 'Chưa khả dụng',
  topicRequired: 'Vui lòng nhập chủ đề tranh luận.',
  backToSetup: 'Quay lại thiết lập',
  newDebate: 'Trận đấu mới',
  // ── End Session ──
  endSession: '🚩 Kết thúc tranh biện',
  endSessionConfirmTitle: 'Kết thúc phiên tranh biện?',
  endSessionConfirmBody: 'Bạn sẽ không thể gửi thêm lập luận sau khi kết thúc. Phiên sẽ được lưu vào Lịch sử.',
  endSessionConfirm: 'Kết thúc',
  endSessionCancel: 'Tiếp tục tranh biện',
  endSessionSummaryTitle: '🏆 Phiên tranh biện hoàn thành!',
  endSessionSummaryTurns: 'Số lượt',
  endSessionSummaryAvgScore: 'Điểm trung bình',
  endSessionSummaryBestScore: 'Điểm cao nhất',
  endSessionViewHistory: '📋 Xem lại tại Lịch sử',
  endSessionNewDebate: '⚔️ Bắt đầu trận mới',
  endSessionCompleting: 'Đang lưu...',
  // ── History Screen ──
  historyTitle: 'Lịch sử tranh luận',
  historyEmpty: 'Bạn chưa có buổi tranh luận nào. Hãy bắt đầu trận đầu tiên!',
  historyLoadError: 'Không thể tải lịch sử. Vui lòng thử lại.',
  historyTurns: 'lượt',
  historyStatus: 'Trạng thái',
  historyStatusInProgress: 'Đang diễn ra',
  historyStatusCompleted: 'Hoàn thành',
  historySide: 'Phe',
  historyViewDetail: 'Xem chi tiết',
  historyDetailTitle: 'Chi tiết buổi tranh luận',
  historyDetailYou: 'Bạn',
  historyDetailOpponent: 'Đối thủ AI',
  historyDetailClose: 'Đóng',
  historyEvidenceStar: 'Dẫn chứng',
  historyFallacies: 'Ngụy biện',
  historyDebatedOn: 'Ngày tranh luận',
  historyDelete: 'Xóa',
  historyDeleteConfirm: 'Bạn có chắc muốn xóa bài tranh luận này? Hành động này không thể hoàn tác.',
  historyDeleting: 'Đang xóa...',
  historyManage: 'Quản lý',
  historySelectAll: 'Chọn tất cả',
  historyDeselectAll: 'Bỏ chọn tất cả',
  historyDeleteSelected: 'Xóa đã chọn',
  historyDeleteAll: 'Xóa toàn bộ lịch sử',
  historyDeleteAllConfirm: 'Bạn có chắc muốn xóa TOÀN BỘ lịch sử tranh luận? Hành động này không thể hoàn tác.',
  historyBulkDeleting: 'Đang xóa...',
  historyCancelSelect: 'Hủy',
  historyDeleteSelectedConfirm: 'Bạn có chắc muốn xóa {n} phiên đã chọn? Hành động này không thể hoàn tác.',
  // ── Replay Engine ──
  replayEngine: 'Replay Engine — Xem lại',
  replayTimeline: 'Dòng thời gian',
  replaySingleTurn: 'Từng lượt',
  replayAllTurns: 'Toàn bộ',
  replayPrevTurn: 'Lượt trước',
  replayNextTurn: 'Lượt sau',
  replayNoTurns: 'Chưa có lượt tranh luận nào được ghi nhận.',
  replayVoiceTitle: 'Chỉ số Voice Coach',
  replayLogicTitle: 'Đánh giá Logic Coach',
  replayListenOpponent: 'Nghe lại phản hồi',
  replayEvidenceRating: 'Chất lượng dẫn chứng',
  replayFallaciesDetected: 'Ngụy biện phát hiện',
  replayNoFallacies: 'Không phát hiện ngụy biện — Lập luận chặt chẽ!',
  replayWpm: 'Tốc độ nói (WPM)',
  replayWpmNormal: 'Tốc độ chuẩn (120-160 WPM)',
  replayWpmFast: 'Nói nhanh (>160 WPM)',
  replayWpmSlow: 'Nói chậm (<120 WPM)',
  replayDuration: 'Thời lượng nói',
  replayFillers: 'Từ đệm phát hiện',
  replaySearchPlaceholder: 'Tìm kiếm chủ đề tranh luận...',
  subscribeTitle: 'Nâng cấp tài khoản',
  subscribeSubtitle: 'Mở khóa toàn bộ tính năng AI Debate Master',
  subscribeClose: 'Đóng',
  subscribePlanFree: 'Miễn phí — 10 lượt/tháng',
  subscribePlanStandard: 'Standard — 100 lượt/tháng · 99.000₫',
  subscribePlanPremium: 'Premium — Không giới hạn · 299.000₫',
  subscribeContact: 'Liên hệ: support@debate.ai',
  // ── Plaza Domain ──
  plazaTitle: 'Quảng trường',
  plazaSubtitle: 'Học hỏi từ các bài tranh biện xuất sắc của cộng đồng',
  plazaLatest: 'Mới nhất',
  plazaPopular: 'Phổ biến',
  plazaSearchPlaceholder: 'Tìm kiếm chủ đề tranh biện...',
  plazaEmpty: 'Chưa có bài tranh biện nào được công khai.',
  plazaNoResults: 'Không tìm thấy kết quả cho từ khóa này.',
  plazaLoading: 'Đang tải Quảng trường...',
  plazaLoadError: 'Không thể tải dữ liệu. Vui lòng thử lại.',
  plazaScore: 'Điểm tổng',
  plazaTurns: 'lượt',
  plazaLike: 'Thả tim',
  plazaFavorite: 'Lưu trữ',
  plazaViews: 'lượt xem',
  plazaStudy: 'Nghiên cứu bài nói',
  plazaClose: 'Đóng',
  plazaLearningViewTitle: 'Chế độ học hỏi — Xem chi tiết bài tranh biện',
  plazaTranscript: 'Transcript tranh biện',
  plazaCreTitle: 'Phân tích Claim – Reasoning – Evidence',
  plazaClaim: 'Luận điểm (Claim)',
  plazaReasoning: 'Lập luận (Reasoning)',
  plazaEvidence: 'Dẫn chứng (Evidence)',
  plazaCoachEval: 'Nhận xét của Logic Coach',
  plazaStrengths: 'Điểm mạnh',
  plazaWeaknesses: 'Điểm yếu',
  plazaSuggestions: 'Gợi ý cải thiện',
  plazaFallacies: 'Ngụy biện phát hiện',
  plazaNoFallacies: 'Không phát hiện ngụy biện — Lập luận chặt chẽ! ✅',
  plazaYou: 'Người học',
  plazaOpponent: 'Đối thủ AI',
  plazaAffirmative: 'Ủng hộ',
  plazaNegative: 'Phản đối',
  plazaContentScore: 'Nội dung',
  plazaStyleScore: 'Phong cách',
  plazaStrategyScore: 'Chiến lược',
  plazaEvidenceStar: 'Chất lượng dẫn chứng',
  plazaNoCoachFeedback: 'Chưa có nhận xét Coach cho lượt này.',
  plazaHighlightQuote: 'Luận điểm nổi bật',
  plazaSonTung: 'Sơn Tùng',
  plazaHoaMinzy: 'Hòa Minzy',
  // ── Profile & Subscription Domain ──
  profileTitle: 'Hồ sơ',
  profileSubtitle: 'Quản lý tài khoản và gói dịch vụ',
  profileName: 'Tên hiển thị',
  profileRole: 'Vai trò',
  profileMemberSince: 'Thành viên từ',
  profileLanguageSwitch: 'Ngôn ngữ giao diện',
  profileSaveChanges: 'Lưu thay đổi',
  profileSaving: 'Đang lưu...',
  profileSaved: 'Đã lưu ✅',
  profileSaveError: 'Lưu thất bại. Thử lại.',
  profileNoSubscription: 'Chưa có gói dịch vụ — Đăng ký ngay để bắt đầu!',
  profileSubscriptionExpired: 'Gói dịch vụ đã hết hạn — Gia hạn để tiếp tục.',
  profileCurrentPlan: 'Gói hiện tại',
  profileCycleEnds: 'Chu kỳ kết thúc',
  profileQuotaDashboard: 'Hạn ngạch thời gian thực',
  profileTextDebate: 'Tranh biện văn bản',
  profileVoiceDebate: 'Tranh biện giọng nói',
  profileAssistantCredits: 'Trợ lý AI',
  profileRemaining: 'còn lại',
  profileSessionsLeft: 'phiên',
  profileMinutesLeft: 'phút',
  profileCreditsLeft: 'lượt',
  profileUpgradePlan: 'Nâng cấp gói',
  profileChoosePlan: 'Chọn gói phù hợp',
  profilePlanCompetition: 'Gói Thi đấu 7 Ngày',
  profilePlanBasic: 'Cơ bản',
  profilePlanStandard: 'Tiêu chuẩn',
  profilePlanPremium: 'Cao cấp',
  profilePer7Days: '/7 ngày',
  profilePerMonth: '/tháng',
  profileSelectPlan: 'Chọn gói này',
  profileCurrentBadge: 'Đang dùng',
  profileCreditPacksTitle: 'Gói Nạp Bổ Sung (Credit Packs)',
  profileCreditPacksSubtitle: 'Bổ sung lượt dùng nhanh chóng — Hiệu lực 30 ngày',
  profileBuyPack: 'Mua gói này',
  profileActivePacks: 'Gói nạp đang hoạt động',
  profilePackExpires: 'Hết hạn vào',
  profileGranularSub: 'Từ gói cước',
  profileGranularPack: 'Từ gói nạp',
  profileMyDebates: 'Hoạt động tranh biện',
  profileCompletedDebates: 'Hoàn thành',
  profileTotalDebates: 'Tổng số phiên',
  profileSavedFavorites: 'Bài tranh biện đã lưu',
  profileGoToPlaza: 'Xem tại Quảng trường →',
  profileLoadError: 'Không thể tải hồ sơ. Thử lại.',
  profileLoading: 'Đang tải hồ sơ...',
  paymentModalTitle: 'Thanh toán Gói dịch vụ',
  paymentOrderSummary: 'Thông tin đơn hàng',
  paymentItem: 'Sản phẩm',
  paymentTotalAmount: 'Tổng thanh toán',
  paymentMethod: 'Phương thức thanh toán',
  paymentQrInstruction: 'Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử để hoàn tất thanh toán.',
  paymentSimulateSuccess: 'Xác nhận thanh toán (Mô phỏng Webhook)',
  paymentSandboxDirect: 'Kích hoạt tức thì (Chế độ Sandbox Dev)',
  paymentProcessing: 'Đang xử lý...',
  paymentSuccessTitle: 'Thanh toán thành công! 🎉',
  paymentSuccessMsg: 'Gói cước / Lượt dùng của bạn đã được kích hoạt thành công.',
  paymentClose: 'Đóng',
  paymentCancel: 'Hủy giao dịch',
  paymentMethodSepay: 'Chuyển khoản VietQR (SePAY)',
  paymentMethodVnpay: 'VNPAY (Thẻ ATM / QR)',
  paymentMethodMomo: 'Ví MoMo',
  paymentMethodSandbox: 'Sandbox Test',
  paymentOpenGateway: 'Chuyển tới cổng thanh toán',
  paymentBankName: 'Ngân hàng',
  paymentAccountNumber: 'Số tài khoản',
  paymentAccountName: 'Chủ tài khoản',
  paymentTransferMemo: 'Nội dung chuyển khoản',
  paymentCopy: 'Sao chép',
  paymentCopied: 'Đã chép',
  paymentAutoConfirmNotice: 'Hệ thống sẽ tự động kích hoạt tài khoản trong vòng 5-30 giây sau khi chuyển khoản thành công.',
  // ── Team Pass & School Bundles ──
  teamBundlesTitle: 'Gói Đội thi & CLB (Team Bundles)',
  teamBundlesSubtitle: 'Mua theo nhóm tiết kiệm tới 40% — Cấp lượt dùng độc lập cho từng thành viên',
  team3Sprint: 'Gói Đội thi 3 người (7 ngày)',
  team3Standard: 'Gói Đội thi 3 người (30 ngày)',
  team5Wsdc: 'Đội tuyển WSDC 5 bạn (30 ngày)',
  school10Standard: 'Gói CLB / Trường 10 người (30 ngày)',
  teamRedeemCardTitle: 'Kích hoạt Mã Mời Đội thi / CLB',
  teamRedeemCardSubtitle: 'Bạn có mã mời từ trưởng nhóm hoặc CLB? Nhập mã tại đây để nhận lượt dùng độc lập.',
  teamRedeemBtn: 'Nhập mã mời',
  teamRedeemModalTitle: 'Kích hoạt Mã Mời Đội thi',
  teamRedeemInputPlaceholder: 'Nhập mã mời (Ví dụ: TEAM_8F2A9K1B)',
  teamRedeeming: 'Đang kích hoạt...',
  teamRedeemSuccess: 'Kích hoạt mã thành công! Bạn đã tham gia đội và nhận gói cước độc lập.',
  teamMyTeamsTitle: 'Quản lý Đội thi & Ghế Thành viên',
  teamSeatsLabel: 'ghế đã kích hoạt',
  teamLeaderLabel: 'Trưởng đội (Leader)',
  teamMemberLabel: 'Thành viên',
  teamSeatVacant: 'Ghế trống (Chờ kích hoạt)',
  teamInviteCodeLabel: 'Mã mời:',
  teamCopyCode: 'Sao chép mã',
  teamCodeCopied: 'Đã sao chép!',
  teamSeatsActivated: 'ghế thành viên',
};


const en: Strings = {
  headerTitle: 'AI Debate Master',
  headerSubtitle: 'Sharpen your critical thinking with an AI Coach',
  subscribeCta: 'Subscribe now',
  languageLabel: 'Language',
  sparringTitle: 'AI Sparring',
  you: 'You',
  versus: 'VS',
  opponent: 'AI Opponent',
  chooseCharacter: 'Choose opponent character',
  sonTung: 'Son Tung',
  hoaMinzy: 'Hoa Minzy',
  sideLabel: 'Choose debate side',
  affirmative: 'For',
  negative: 'Against',
  audioMode: 'Audio mode',
  voiceMode: 'Voice',
  textMode: 'Text',
  topicLabel: 'Enter debate topic',
  topicPlaceholder: 'E.g. Should social media be banned for under-15 students?',
  startDebate: 'Start debate',
  speechDraft: 'Draft a debate speech',
  topicReport: 'Generate topic analysis report',
  suggestedTopics: 'Suggested topics',
  navArena: 'Arena',
  navHistory: 'History',
  navPlaza: 'Plaza',
  navProfile: 'Profile',
  navAssistant: 'Assistant',
  workspaceTitle: 'Debate workspace',
  yourArgumentLabel: 'Your argument',
  yourArgumentPlaceholder: 'State your Claim, Reasoning, and Evidence...',
  submit: 'Submit argument',
  submitting: 'Analyzing...',
  loading: 'Loading...',
  networkError: 'Could not reach the server. Please try again.',
  serverError: 'Server returned an error',
  tryAgain: 'Try again',
  coachFeedback: 'Live Coach feedback',
  overallScore: 'Overall score',
  claim: 'Claim',
  reasoning: 'Reasoning',
  evidence: 'Evidence',
  fallacies: 'Detected fallacies',
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  suggestions: 'Actionable suggestions',
  noFeedbackYet: 'No feedback yet. Submit your first argument.',
  telemetry: 'Telemetry',
  tokens: 'Tokens',
  inputTokens: 'Input',
  outputTokens: 'Output',
  executionMs: 'Execution time',
  turnLabel: 'Turn',
  scoreImproved: '↑ Improved',
  scoreNeedsImprovement: '↓ Needs improvement',
  notAvailable: 'N/A',
  assistantPlaceholder: 'Assistant features will be available in a later phase.',
  assistantUnavailable: 'Not available yet',
  topicRequired: 'Please enter a debate topic.',
  backToSetup: 'Back to setup',
  newDebate: 'New debate',
  // ── End Session ──
  endSession: '🚩 End debate',
  endSessionConfirmTitle: 'End this debate session?',
  endSessionConfirmBody: 'You will not be able to submit more arguments after ending. The session will be saved to History.',
  endSessionConfirm: 'End session',
  endSessionCancel: 'Continue debating',
  endSessionSummaryTitle: '🏆 Session complete!',
  endSessionSummaryTurns: 'Turns',
  endSessionSummaryAvgScore: 'Average score',
  endSessionSummaryBestScore: 'Best score',
  endSessionViewHistory: '📋 View in History',
  endSessionNewDebate: '⚔️ Start new debate',
  endSessionCompleting: 'Saving...',
  // ── History Screen ──
  historyTitle: 'Debate history',
  historyEmpty: "You haven't debated yet. Start your first session!",
  historyLoadError: 'Could not load history. Please try again.',
  historyTurns: 'turns',
  historyStatus: 'Status',
  historyStatusInProgress: 'In progress',
  historyStatusCompleted: 'Completed',
  historySide: 'Side',
  historyViewDetail: 'View',
  historyDetailTitle: 'Debate detail',
  historyDetailYou: 'You',
  historyDetailOpponent: 'AI Opponent',
  historyDetailClose: 'Close',
  historyEvidenceStar: 'Evidence',
  historyFallacies: 'Fallacies',
  historyDebatedOn: 'Debated on',
  historyDelete: 'Delete',
  historyDeleteConfirm: 'Are you sure you want to delete this debate? This action cannot be undone.',
  historyDeleting: 'Deleting...',
  historyManage: 'Manage',
  historySelectAll: 'Select all',
  historyDeselectAll: 'Deselect all',
  historyDeleteSelected: 'Delete selected',
  historyDeleteAll: 'Clear all history',
  historyDeleteAllConfirm: 'Are you sure you want to delete ALL debate history? This cannot be undone.',
  historyBulkDeleting: 'Deleting...',
  historyCancelSelect: 'Cancel',
  historyDeleteSelectedConfirm: 'Are you sure you want to delete {n} selected sessions? This cannot be undone.',
  // ── Replay Engine ──
  replayEngine: 'Replay Engine — Review',
  replayTimeline: 'Timeline',
  replaySingleTurn: 'Single turn',
  replayAllTurns: 'All turns',
  replayPrevTurn: 'Previous',
  replayNextTurn: 'Next',
  replayNoTurns: 'No turns recorded in this session.',
  replayVoiceTitle: 'Voice Coach Metrics',
  replayLogicTitle: 'Logic Coach Evaluation',
  replayListenOpponent: 'Listen to rebuttal',
  replayEvidenceRating: 'Evidence Quality',
  replayFallaciesDetected: 'Fallacies Detected',
  replayNoFallacies: 'No fallacies detected — Solid reasoning!',
  replayWpm: 'Speaking Speed (WPM)',
  replayWpmNormal: 'Normal pace (120-160 WPM)',
  replayWpmFast: 'Fast pace (>160 WPM)',
  replayWpmSlow: 'Slow pace (<120 WPM)',
  replayDuration: 'Speaking Duration',
  replayFillers: 'Filler words',
  replaySearchPlaceholder: 'Search debate topic...',
  subscribeTitle: 'Upgrade your account',
  subscribeSubtitle: 'Unlock all AI Debate Master features',
  subscribeClose: 'Close',
  subscribePlanFree: 'Free — 10 sessions/month',
  subscribePlanStandard: 'Standard — 100 sessions/month · $4.99',
  subscribePlanPremium: 'Premium — Unlimited · $12.99',
  subscribeContact: 'Contact: support@debate.ai',
  // ── Plaza Domain ──
  plazaTitle: 'Plaza',
  plazaSubtitle: 'Learn from outstanding community debate sessions',
  plazaLatest: 'Latest',
  plazaPopular: 'Popular',
  plazaSearchPlaceholder: 'Search debate topics...',
  plazaEmpty: 'No public debate sessions yet.',
  plazaNoResults: 'No results found for this keyword.',
  plazaLoading: 'Loading Plaza...',
  plazaLoadError: 'Could not load data. Please try again.',
  plazaScore: 'Score',
  plazaTurns: 'turns',
  plazaLike: 'Like',
  plazaFavorite: 'Save',
  plazaViews: 'views',
  plazaStudy: 'Study this debate',
  plazaClose: 'Close',
  plazaLearningViewTitle: 'Learning View — Debate Detail',
  plazaTranscript: 'Debate transcript',
  plazaCreTitle: 'Claim – Reasoning – Evidence Analysis',
  plazaClaim: 'Claim',
  plazaReasoning: 'Reasoning',
  plazaEvidence: 'Evidence',
  plazaCoachEval: 'Logic Coach Evaluation',
  plazaStrengths: 'Strengths',
  plazaWeaknesses: 'Weaknesses',
  plazaSuggestions: 'Actionable suggestions',
  plazaFallacies: 'Detected fallacies',
  plazaNoFallacies: 'No fallacies detected — Solid reasoning! ✅',
  plazaYou: 'Learner',
  plazaOpponent: 'AI Opponent',
  plazaAffirmative: 'For',
  plazaNegative: 'Against',
  plazaContentScore: 'Content',
  plazaStyleScore: 'Style',
  plazaStrategyScore: 'Strategy',
  plazaEvidenceStar: 'Evidence Quality',
  plazaNoCoachFeedback: 'No coach feedback for this turn.',
  plazaHighlightQuote: 'Key argument',
  plazaSonTung: 'Son Tung',
  plazaHoaMinzy: 'Hoa Minzy',
  // ── Profile & Subscription Domain ──
  profileTitle: 'Profile',
  profileSubtitle: 'Manage your account and subscription',
  profileName: 'Display name',
  profileRole: 'Role',
  profileMemberSince: 'Member since',
  profileLanguageSwitch: 'Interface language',
  profileSaveChanges: 'Save changes',
  profileSaving: 'Saving...',
  profileSaved: 'Saved ✅',
  profileSaveError: 'Save failed. Try again.',
  profileNoSubscription: 'No active plan — Subscribe to get started!',
  profileSubscriptionExpired: 'Your plan has expired — Renew to continue.',
  profileCurrentPlan: 'Current plan',
  profileCycleEnds: 'Cycle ends',
  profileQuotaDashboard: 'Real-time Quota Dashboard',
  profileTextDebate: 'Text debate sessions',
  profileVoiceDebate: 'Voice debate sessions',
  profileAssistantCredits: 'AI Assistant credits',
  profileRemaining: 'remaining',
  profileSessionsLeft: 'sessions',
  profileMinutesLeft: 'minutes',
  profileCreditsLeft: 'credits',
  profileUpgradePlan: 'Upgrade plan',
  profileChoosePlan: 'Choose a plan',
  profilePlanCompetition: '7-Day Tournament Pass',
  profilePlanBasic: 'Basic',
  profilePlanStandard: 'Standard',
  profilePlanPremium: 'Premium',
  profilePer7Days: '/7 days',
  profilePerMonth: '/month',
  profileSelectPlan: 'Select this plan',
  profileCurrentBadge: 'Current',
  profileCreditPacksTitle: 'Add-on Credit Packs',
  profileCreditPacksSubtitle: 'Quick top-up for extra sessions — Valid for 30 days',
  profileBuyPack: 'Buy this pack',
  profileActivePacks: 'Active credit packs',
  profilePackExpires: 'Expires on',
  profileGranularSub: 'From subscription',
  profileGranularPack: 'From credit pack',
  profileMyDebates: 'My debate activity',
  profileCompletedDebates: 'Completed',
  profileTotalDebates: 'Total sessions',
  profileSavedFavorites: 'Saved debates',
  profileGoToPlaza: 'View in Plaza →',
  profileLoadError: 'Could not load profile. Try again.',
  profileLoading: 'Loading profile...',
  paymentModalTitle: 'Checkout Order',
  paymentOrderSummary: 'Order Summary',
  paymentItem: 'Product',
  paymentTotalAmount: 'Total Amount',
  paymentMethod: 'Payment Method',
  paymentQrInstruction: 'Scan the QR code with your mobile banking or e-wallet app to complete payment.',
  paymentSimulateSuccess: 'Confirm Payment (Simulate Webhook)',
  paymentSandboxDirect: 'Instant Activate (Sandbox Dev Mode)',
  paymentProcessing: 'Processing...',
  paymentSuccessTitle: 'Payment Successful! 🎉',
  paymentSuccessMsg: 'Your plan / credits have been successfully activated.',
  paymentClose: 'Close',
  paymentCancel: 'Cancel Order',
  paymentMethodSepay: 'VietQR Bank Transfer (SePAY)',
  paymentMethodVnpay: 'VNPay (ATM Cards / QR)',
  paymentMethodMomo: 'MoMo E-Wallet',
  paymentMethodSandbox: 'Sandbox Test',
  paymentOpenGateway: 'Go to Payment Gateway',
  paymentBankName: 'Bank',
  paymentAccountNumber: 'Account Number',
  paymentAccountName: 'Account Name',
  paymentTransferMemo: 'Transfer Memo',
  paymentCopy: 'Copy',
  paymentCopied: 'Copied',
  paymentAutoConfirmNotice: 'Your account will be activated automatically within 5-30 seconds after transfer confirmation.',
  // ── Team Pass & School Bundles ──
  teamBundlesTitle: 'Team Passes & School Bundles',
  teamBundlesSubtitle: 'Save up to 40% with group bundles — Grants independent quota allocations to each member',
  team3Sprint: 'Team 3-Seat Sprint Pass (7 Days)',
  team3Standard: 'Team 3-Seat Standard Pass (30 Days)',
  team5Wsdc: 'WSDC 5-Seat Team Pass (30 Days)',
  school10Standard: 'School/Club 10-Seat Pass (30 Days)',
  teamRedeemCardTitle: 'Redeem Team / School Invitation Code',
  teamRedeemCardSubtitle: 'Received an invite code from your team leader or club? Enter it here to activate your seat.',
  teamRedeemBtn: 'Enter Invitation Code',
  teamRedeemModalTitle: 'Redeem Team Invitation',
  teamRedeemInputPlaceholder: 'Enter invitation code (e.g. TEAM_8F2A9K1B)',
  teamRedeeming: 'Redeeming...',
  teamRedeemSuccess: 'Code redeemed successfully! You have joined the team with an independent quota.',
  teamMyTeamsTitle: 'Team & Seat Management',
  teamSeatsLabel: 'seats activated',
  teamLeaderLabel: 'Team Leader',
  teamMemberLabel: 'Member',
  teamSeatVacant: 'Vacant Seat (Awaiting activation)',
  teamInviteCodeLabel: 'Invite Code:',
  teamCopyCode: 'Copy Code',
  teamCodeCopied: 'Copied!',
  teamSeatsActivated: 'member seats',
};


export const translations: Record<Language, Strings> = { vi, en };
