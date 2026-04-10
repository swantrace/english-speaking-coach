// src/agent/prompts/session-analysis/schema.ts
// import { z } from "zod";
// import type { SessionTargetKp } from "../../db/schema";
import type { ProviderId } from "../types";

/**
 * One turn in the role-play transcript.
 * Backend会从 rolePlayMessages 映射到这个结构：
 *   { role: "user" | "assistant", content: string }
 */
// export const SessionTranscriptTurnSchema = z.object({
//   role: z.enum(["user", "assistant"]),
//   content: z.string(),
// });

// export type SessionTranscriptTurn = z.infer<typeof SessionTranscriptTurnSchema>;

/**
 * 这是写入 DB `sessionAnalyses.analysisJson` 的结构。
 * 精简版本，聚焦于最有效的学习反馈：
 *  - 具体纠错（最重要）
 *  - 新学到的表达
 *  - 高层模式问题
 */
// export const SessionAnalysisSchema = z.object({
//   /**
//    * 高层概述：这场 role-play 发生了什么、整体表现如何。
//    * 用简明英文即可。2-4 句话。
//    */
//   summary: z.string(),

//   /**
//    * 具体纠错建议（最重要的部分）。
//    * 指出用户的具体错误，并给出地道的修正说法。
//    */
//   corrections: z
//     .array(
//       z.object({
//         original: z.string().describe("The learner's original phrase/sentence"),
//         correction: z.string().describe("The natural, native way to say it"),
//         explanation: z.string().describe("Why the correction is better"),
//       }),
//     )
//     .default([]),

//   /**
//    * 在对话中出现的、值得记录的新表达。
//    * 后端可用来生成新的 knowledge points。
//    */
//   newlyDiscoveredKps: z
//     .array(
//       z.object({
//         phrase: z.string(),
//         explanation: z.string(),
//       }),
//     )
//     .default([]),

//   /**
//    * 1-3 条高层次的重复性问题模式（如果有的话）。
//    * 例如："Inconsistent past tense usage", "Tends to drop articles".
//    * 这些是从多个 corrections 中总结出来的共同问题。
//    */
//   patternIssues: z.array(z.string()).default([]),
// });

// export type SessionAnalysis = z.infer<typeof SessionAnalysisSchema>;

/**
 * 用于构造分析 prompt 的参数。
 *
 * - scenario：场景层面的信息
 * - session：本场 snapshot 的 goals + targetKps
 * - transcript：按时间排序的 user/assistant 消息
 */
// export type BuildSessionAnalysisPromptParams = {
//   provider: ProviderId; // 目前只作为占位，用于以后 provider 特化规则

//   scenario: {
//     title: string;
//     description: string;
//   };

//   session: {
//     /**
//      * 当时 snapshot 的目标（对应 rolePlaySessions.initialGoals）。
//      */
//     goals: string[];

//     /**
//      * 当时 snapshot 的 targetKps（id + phrase，对应 initialTargetKps）。
//      */
//     targetKps: SessionTargetKp[];
//   };

//   /**
//    * 按时间顺序排列的 transcript。
//    */
//   transcript: SessionTranscriptTurn[];

//   /**
//    * 学习者等级，用于控制分析措辞（以后可以从用户设置来的）。
//    * 和 free-form 那边的 learnerLevel 取值保持一致会比较好。
//    */
//   learnerLevel: "A2" | "B1" | "B2" | "C1";
// };
