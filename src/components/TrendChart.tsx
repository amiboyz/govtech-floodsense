import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Dashboard } from "../types";

export function TrendChart({ data }: { data: Dashboard["timeline"] }) {
  const formatted = data.map((row) => ({ ...row, time: new Date(row.observed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 12, right: 10, bottom: 0, left: -28 }}>
        <defs>
          <linearGradient id="rain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#39d5c6" stopOpacity={0.5}/><stop offset="1" stopColor="#39d5c6" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid stroke="#243832" vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="time" stroke="#789189" tick={{ fontSize: 10 }} interval={5} axisLine={false} tickLine={false} />
        <YAxis stroke="#789189" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0f241d", border: "1px solid #2b433b", borderRadius: 10, color: "#eaf5f1" }} />
        <Area type="monotone" dataKey="rainfall_mm" name="Hujan (mm)" stroke="#39d5c6" fill="url(#rain)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
