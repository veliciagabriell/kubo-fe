"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { mapContainerMatch, mapDocument, mapShipment } from "./adapters";
import type {
  ApiContainer,
  ApiDocument,
  ApiDocumentSchema,
  ApiDocumentTypeInfo,
  ApiOrder,
  ApiScoredContainer,
  ApiShipment,
} from "./api-types";
import type { ContainerMatch, ExportDocument, Shipment } from "@/types";

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

export function useShipments() {
  const [state, setState] = useState<AsyncState<Shipment[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiShipment[] }>("/shipments")
      .then((res) => !cancelled && setState({ data: res.data.map(mapShipment), loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: [], loading: false, error: errorMessage(e, "Gagal memuat pengiriman.") }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useShipment(id?: string) {
  const [state, setState] = useState<AsyncState<Shipment | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      queueMicrotask(() => !cancelled && setState({ data: null, loading: false, error: null }));
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => !cancelled && setState((s) => ({ ...s, loading: true })));
    api
      .get<{ data: ApiShipment }>(`/shipments/${id}`)
      .then((res) => !cancelled && setState({ data: mapShipment(res.data), loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: errorMessage(e, "Pengiriman tidak ditemukan.") }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state;
}

export function useContainers(forCbm?: number) {
  const [state, setState] = useState<AsyncState<ContainerMatch[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    const qs = forCbm ? `?forCbm=${forCbm}` : "";
    api
      .get<{ data: ApiContainer[] }>(`/matching/containers${qs}`)
      .then((res) => !cancelled && setState({ data: res.data.map(mapContainerMatch), loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: [], loading: false, error: errorMessage(e, "Gagal memuat container.") }));
    return () => {
      cancelled = true;
    };
  }, [forCbm]);
  return state;
}

export function useContainer(id?: string, forCbm?: number) {
  const [state, setState] = useState<AsyncState<ContainerMatch | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      queueMicrotask(() => !cancelled && setState({ data: null, loading: false, error: null }));
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => !cancelled && setState((s) => ({ ...s, loading: true })));
    const qs = forCbm ? `?forCbm=${forCbm}` : "";
    api
      .get<{ data: ApiContainer }>(`/matching/containers/${id}${qs}`)
      .then((res) => !cancelled && setState({ data: mapContainerMatch(res.data), loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: errorMessage(e, "Container tidak ditemukan.") }));
    return () => {
      cancelled = true;
    };
  }, [id, forCbm]);
  return state;
}

export async function findMatches(destinationCountry: string, volumeCbm: number, preferredDate: string) {
  const res = await api.post<{ data: ApiScoredContainer[] }>("/matching/find", {
    destinationCountry,
    volumeCbm,
    preferredDate,
  });
  return res.data.map(mapContainerMatch);
}

export function useDocuments(shipmentId?: string) {
  const [state, setState] = useState<AsyncState<ExportDocument[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<{ data: ApiDocument[] }>(shipmentId ? `/documents?shipmentId=${shipmentId}` : "/documents"),
      api.get<{ data: ApiDocumentTypeInfo[] }>("/documents/types"),
    ])
      .then(([docsRes, typesRes]) => {
        if (!cancelled) setState({ data: docsRes.data.map((d) => mapDocument(d, typesRes.data)), loading: false, error: null });
      })
      .catch((e) => !cancelled && setState({ data: [], loading: false, error: errorMessage(e, "Gagal memuat dokumen.") }));
    return () => {
      cancelled = true;
    };
  }, [shipmentId]);
  return state;
}

export function useDocumentTypes() {
  const [state, setState] = useState<AsyncState<ApiDocumentTypeInfo[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiDocumentTypeInfo[] }>("/documents/types")
      .then((res) => !cancelled && setState({ data: res.data, loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: [], loading: false, error: errorMessage(e, "Gagal memuat jenis dokumen.") }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useDocumentSchema(type?: string) {
  const [state, setState] = useState<AsyncState<ApiDocumentSchema | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!type) {
      queueMicrotask(() => !cancelled && setState({ data: null, loading: false, error: null }));
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => !cancelled && setState((s) => ({ ...s, loading: true })));
    api
      .get<{ data: ApiDocumentSchema }>(`/documents/schema/${type}`)
      .then((res) => !cancelled && setState({ data: res.data, loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: errorMessage(e, "Jenis dokumen tidak ditemukan.") }));
    return () => {
      cancelled = true;
    };
  }, [type]);
  return state;
}

export function useOrders() {
  const [state, setState] = useState<AsyncState<ApiOrder[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ApiOrder[] }>("/orders?limit=100")
      .then((res) => !cancelled && setState({ data: res.data, loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: [], loading: false, error: errorMessage(e, "Gagal memuat riwayat pembayaran.") }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
