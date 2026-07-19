"use client";

import { type Dispatch, type SetStateAction, useEffect } from "react";
import type { ScanUniverse } from "@/components/scanTypes";
import type { StrategySettings } from "@/lib/types";

type SettingsResponse = {
  settings: StrategySettings;
};

export function useScanDefaults({
  setUniverse,
  setPersist,
  setAlerts,
}: {
  setUniverse: Dispatch<SetStateAction<ScanUniverse>>;
  setPersist: Dispatch<SetStateAction<boolean>>;
  setAlerts: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    let active = true;

    async function loadScanDefaults() {
      try {
        const response = await fetch("/api/settings", {
          method: "GET",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SettingsResponse;

        if (!active) {
          return;
        }

        setUniverse(data.settings.defaultScanUniverse);
        setPersist(data.settings.persistScansDefault);
        setAlerts(data.settings.telegramAlertsDefault);
      } catch {
        // Settings defaults are optional; keep local defaults if unavailable.
      }
    }

    loadScanDefaults();

    return () => {
      active = false;
    };
  }, [setAlerts, setPersist, setUniverse]);
}
