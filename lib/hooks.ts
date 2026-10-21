"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import {
  mapContainerMatch,
  mapDocument,
  mapOriginPortsInfo,
  mapShipment,
  mapVesselIdentity,
  mapVoyage,
} from "./adapters";
import type {
  ApiContainer,
  ApiDocument,
  ApiDocumentSchema,
  ApiDocumentTypeInfo,
  ApiOrder,
  ApiOriginPortsInfo,
  ApiScoredContainer,
  ApiShipment,
  ApiVessel,
  ApiVoyage,
} from "./api-types";
import type {
  ContainerMatch,
  ExportDocument,
  OriginPortsInfo,
  Shipment,
  VesselIdentity,
  Voyage,
} from "@/types";

/** Live AIS data refresh interval - near-real-time via REST polling (see plan: no dummy fallback, so empty results are expected until AISstream observes a real vessel). */
const LIVE_POLL_MS = 20_000;

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

export function useShipments() {
  const [state, setState] = useState<AsyncState<Shipment[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiShipment[] }>("/shipments")
      .then(
        (res) =>
          !cancelled &&
          setState({
            data: res.data.map(mapShipment),
            loading: false,
            error: null,
          }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: [],
            loading: false,
            error: errorMessage(e, "Failed to load shipments."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useShipment(id?: string) {
  const [state, setState] = useState<AsyncState<Shipment | null>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      queueMicrotask(
        () =>
          !cancelled && setState({ data: null, loading: false, error: null }),
      );
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(
      () => !cancelled && setState((s) => ({ ...s, loading: true })),
    );
    api
      .get<{ data: ApiShipment }>(`/shipments/${id}`)
      .then(
        (res) =>
          !cancelled &&
          setState({
            data: mapShipment(res.data),
            loading: false,
            error: null,
          }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: null,
            loading: false,
            error: errorMessage(e, "Shipment not found."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state;
}

export function useContainers(forCbm?: number) {
  const [state, setState] = useState<AsyncState<ContainerMatch[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    const qs = forCbm ? `?forCbm=${forCbm}` : "";
    function load(showLoading: boolean) {
      if (showLoading) setState((s) => ({ ...s, loading: true }));
      api
        .get<{ data: ApiContainer[] }>(`/matching/containers${qs}`)
        .then(
          (res) =>
            !cancelled &&
            setState({
              data: res.data.map(mapContainerMatch),
              loading: false,
              error: null,
            }),
        )
        .catch(
          (e) =>
            !cancelled &&
            setState((s) => ({
              ...s,
              loading: false,
              error: errorMessage(e, "Failed to load containers."),
            })),
        );
    }
    load(true);
    const interval = setInterval(() => load(false), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [forCbm]);
  return state;
}

export function useContainer(id?: string, forCbm?: number) {
  const [state, setState] = useState<AsyncState<ContainerMatch | null>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      queueMicrotask(
        () =>
          !cancelled && setState({ data: null, loading: false, error: null }),
      );
      return () => {
        cancelled = true;
      };
    }
    const qs = forCbm ? `?forCbm=${forCbm}` : "";
    function load(showLoading: boolean) {
      if (showLoading) setState((s) => ({ ...s, loading: true }));
      api
        .get<{ data: ApiContainer }>(`/matching/containers/${id}${qs}`)
        .then(
          (res) =>
            !cancelled &&
            setState({
              data: mapContainerMatch(res.data),
              loading: false,
              error: null,
            }),
        )
        .catch(
          (e) =>
            !cancelled &&
            setState((s) => ({
              ...s,
              loading: false,
              error: errorMessage(e, "Container not found."),
            })),
        );
    }
    load(true);
    const interval = setInterval(() => load(false), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, forCbm]);
  return state;
}

export function useVessels() {
  const [state, setState] = useState<AsyncState<VesselIdentity[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    function load(showLoading: boolean) {
      if (showLoading) setState((s) => ({ ...s, loading: true }));
      api
        .get<{ data: ApiVessel[] }>("/vessels")
        .then(
          (res) =>
            !cancelled &&
            setState({
              data: res.data.map(mapVesselIdentity),
              loading: false,
              error: null,
            }),
        )
        .catch(
          (e) =>
            !cancelled &&
            setState((s) => ({
              ...s,
              loading: false,
              error: errorMessage(e, "Failed to load vessel data."),
            })),
        );
    }
    load(true);
    const interval = setInterval(() => load(false), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return state;
}

export function useVoyages() {
  const [state, setState] = useState<AsyncState<Voyage[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    function load(showLoading: boolean) {
      if (showLoading) setState((s) => ({ ...s, loading: true }));
      api
        .get<{ data: ApiVoyage[] }>("/voyages")
        .then(
          (res) =>
            !cancelled &&
            setState({
              data: res.data.map(mapVoyage),
              loading: false,
              error: null,
            }),
        )
        .catch(
          (e) =>
            !cancelled &&
            setState((s) => ({
              ...s,
              loading: false,
              error: errorMessage(e, "Failed to load voyage data."),
            })),
        );
    }
    load(true);
    const interval = setInterval(() => load(false), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return state;
}

export function useOriginPorts() {
  const [state, setState] = useState<AsyncState<OriginPortsInfo | null>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiOriginPortsInfo>("/matching/origin-ports")
      .then(
        (res) =>
          !cancelled &&
          setState({
            data: mapOriginPortsInfo(res),
            loading: false,
            error: null,
          }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: null,
            loading: false,
            error: errorMessage(e, "Failed to load origin port information."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export async function findMatches(
  destinationCountry: string,
  volumeCbm: number,
  preferredDate: string,
) {
  const res = await api.post<{ data: ApiScoredContainer[] }>("/matching/find", {
    destinationCountry,
    volumeCbm,
    preferredDate,
  });
  return res.data.map(mapContainerMatch);
}

export function useDocuments(shipmentId?: string, refreshToken = 0) {
  const [state, setState] = useState<AsyncState<ExportDocument[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<{ data: ApiDocument[] }>(
        shipmentId ? `/documents?shipmentId=${shipmentId}` : "/documents",
      ),
      api.get<{ data: ApiDocumentTypeInfo[] }>("/documents/types"),
    ])
      .then(([docsRes, typesRes]) => {
        if (!cancelled)
          setState({
            data: docsRes.data.map((d) => mapDocument(d, typesRes.data)),
            loading: false,
            error: null,
          });
      })
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: [],
            loading: false,
            error: errorMessage(e, "Failed to load documents."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [shipmentId, refreshToken]);
  return state;
}

export function useDocumentTypes() {
  const [state, setState] = useState<AsyncState<ApiDocumentTypeInfo[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiDocumentTypeInfo[] }>("/documents/types")
      .then(
        (res) =>
          !cancelled &&
          setState({ data: res.data, loading: false, error: null }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: [],
            loading: false,
            error: errorMessage(e, "Failed to load document types."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useDocumentSchema(type?: string) {
  const [state, setState] = useState<AsyncState<ApiDocumentSchema | null>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    if (!type) {
      queueMicrotask(
        () =>
          !cancelled && setState({ data: null, loading: false, error: null }),
      );
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(
      () => !cancelled && setState((s) => ({ ...s, loading: true })),
    );
    api
      .get<{ data: ApiDocumentSchema }>(`/documents/schema/${type}`)
      .then(
        (res) =>
          !cancelled &&
          setState({ data: res.data, loading: false, error: null }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: null,
            loading: false,
            error: errorMessage(e, "Document type not found."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [type]);
  return state;
}

export function useOrders() {
  const [state, setState] = useState<AsyncState<ApiOrder[]>>({
    data: [],
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiOrder[] }>("/orders?limit=100")
      .then(
        (res) =>
          !cancelled &&
          setState({ data: res.data, loading: false, error: null }),
      )
      .catch(
        (e) =>
          !cancelled &&
          setState({
            data: [],
            loading: false,
            error: errorMessage(e, "Failed to load payment history."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
