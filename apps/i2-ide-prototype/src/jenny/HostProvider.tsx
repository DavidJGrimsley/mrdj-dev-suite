import { createContext, useContext } from "react";

import type { ProjectCreationHost } from "./types.ts";

import { defaultHost } from "./host.ts";

const HostContext = createContext<ProjectCreationHost>(defaultHost);

export const JennyHostProvider = HostContext.Provider;

export const useJennyHost = () => useContext(HostContext);

declare global { interface Window { jennyCreationHost?: ProjectCreationHost } }
