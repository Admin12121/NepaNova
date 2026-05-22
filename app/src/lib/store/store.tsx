import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { userAuthapi } from "./Service/api";

export const store = () => {
  const s = configureStore({
    reducer: {
      [userAuthapi.reducerPath]: userAuthapi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(userAuthapi.middleware),
  });

  setupListeners(s.dispatch);

  return s;
};

export type AppStore = ReturnType<typeof store>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
