import { createContext, useContext } from "react";

/** Whether the surrounding pane has focus. Outside panes (terminal panel) it is always true. */
export const PaneFocusContext = createContext(true);
export const usePaneFocused = () => useContext(PaneFocusContext);
