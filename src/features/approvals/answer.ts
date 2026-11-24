import { useActivity } from "../sessions/activityStore";
import { sendText } from "../sessions/ptySession";
import { logEvent } from "../timeline/eventLog";
import type { PromptOption } from "./detectPrompt";
import type { ID } from "../../types";

/** Chooses an option of the on-screen prompt by sending its keys to the session. */
export async function answerPrompt(id: ID, option: PromptOption) {
  logEvent(id, "answered", option.label);
  useActivity.getState().patch(id, { prompt: undefined, attention: false });
  await sendText(id, option.keys, false);
}

export { optionFromSpeech } from "./speech";
