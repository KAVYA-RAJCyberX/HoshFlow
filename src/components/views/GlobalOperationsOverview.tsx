import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  hospitalManagementService,
  HospitalRecord,
  SystemAlertItem,
} from '../../services/hospitalManagementService';

interface GlobalOperationsOverviewProps {
  onTriggerToast: (msg: string) => void;
  onNavigateHospitalAdmin?: (hospitalId: string) => void;
}

export const GlobalOperationsOverview: React.FC<GlobalOperationsOverviewProps> = ({
  onTriggerToast,
  onNavigateHospitalAdmin,
}) => {
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [alerts, setAlerts] = useState<SystemAlertItem[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [timeframe, setTimeframe] = useState<'7D' | '30D'>('7D');

  // SVG Refs for D3 Renderings
  const patientBarChartRef = useRef<SVGSVGElement | null>(null);
  const occupancyDonutRef = useRef<SVGSVGElement | null>(null);
  const trendLineRef = useRef<SVGSVGElement | null>(null);

  // Sync data from hospitalManagementService
  useEffect(() => {
    const sync = () => {
      setHospitals(hospitalManagementService.getAllHospitals());
      setAlerts(hospitalManagementService.getSystemAlerts());
    };
    sync();
    const unsub = hospitalManagementService.subscribe(sync);
    return () => unsub();
  }, []);

  // Aggregated Metrics
  const analytics = useMemo(() => {
    return hospitalManagementService.getNetworkAnalytics();
  }, [hospitals]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.status === 'ACTIVE').length;
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (selectedSeverity === 'all') return alerts;
    return alerts.filter((a) => a.severity === selectedSeverity);
  }, [alerts, selectedSeverity]);

  // ---------------------------------------------------------------------------
  // 1. D3 VISUALIZATION: Total Patients across all Hospitals (Bar Chart)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!patientBarChartRef.current || analytics.hospitalBreakdown.length === 0) return;

    const svg = d3.select(patientBarChartRef.current);
    svg.selectAll('*').remove();

    const width = 460;
    const height = 240;
    const margin = { top: 20, right: 25, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = analytics.hospitalBreakdown.map((h) => ({
      name: h.name.split(' ')[0] + ' ' + (h.city || ''),
      code: h.code,
      patients: h.patientsCount,
      beds: h.totalBeds,
      occupied: h.occupiedBeds,
    }));

    // Scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.code))
      .range([0, innerWidth])
      .padding(0.35);

    const maxPatients = d3.max(data, (d) => d.patients) || 100;
    const y = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxPatients * 1.25)])
      .nice()
      .range([innerHeight, 0]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    // Defs: Gradients
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'patientBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#141416');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#38383e');

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.code) || 0)
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.patients))
      .attr('height', (d) => innerHeight - y(d.patients))
      .attr('rx', 6)
      .attr('fill', 'url(#patientBarGradient)')
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).attr('fill', '#fcde6d');
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', 'url(#patientBarGradient)');
      });

    // Patient Count value labels on top of bars
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d) => (x(d.code) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.patients) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .attr('font-weight', 'bold')
      .attr('fill', '#141416')
      .text((d) => `${d.patients}`);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select('.domain').attr('stroke', '#e5e7eb'))
      .call((g) => g.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#6b7280');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#9ca3af');
  }, [analytics]);

  // ---------------------------------------------------------------------------
  // 2. D3 VISUALIZATION: Average Occupancy Rate (Radial Donut Gauge)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!occupancyDonutRef.current) return;

    const svg = d3.select(occupancyDonutRef.current);
    svg.selectAll('*').remove();

    const width = 240;
    const height = 240;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.72;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const occupied = analytics.totalOccupied;
    const vacant = Math.max(0, analytics.totalCapacity - occupied);
    const data = [
      { label: 'Occupied', value: occupied, color: '#141416' },
      { label: 'Vacant', value: vacant, color: '#e5e7eb' },
    ];

    const pie = d3
      .pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null)
      .startAngle(-Math.PI * 0.85)
      .endAngle(Math.PI * 0.85);

    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 8)
      .cornerRadius(6);

    // Arcs
    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Central text percentage
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.05em')
      .attr('font-size', '34px')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .attr('font-weight', '800')
      .attr('fill', '#141416')
      .text(`${analytics.avgOccupancyRate}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.6em')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', 'bold')
      .attr('text-transform', 'uppercase')
      .attr('letter-spacing', '0.05em')
      .attr('fill', '#6b7280')
      .text('Avg Occupancy');

    // Subtitle total beds
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '3.1em')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#9ca3af')
      .text(`${occupied} / ${analytics.totalCapacity} Beds`);
  }, [analytics]);

  // ---------------------------------------------------------------------------
  // 3. D3 VISUALIZATION: Multi-Day Inpatient Trend (Area & Line Chart)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!trendLineRef.current) return;

    const svg = d3.select(trendLineRef.current);
    svg.selectAll('*').remove();

    const width = 460;
    const height = 180;
    const margin = { top: 15, right: 20, bottom: 30, left: 35 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Mock 7-day network inpatient trajectory
    const days = ['Sep 19', 'Sep 20', 'Sep 21', 'Sep 22', 'Sep 23', 'Sep 24', 'Sep 25'];
    const currentTotal = analytics.totalPatients || 429;
    const trendData = [
      { day: days[0], count: Math.round(currentTotal * 0.91) },
      { day: days[1], count: Math.round(currentTotal * 0.94) },
      { day: days[2], count: Math.round(currentTotal * 0.93) },
      { day: days[3], count: Math.round(currentTotal * 0.97) },
      { day: days[4], count: Math.round(currentTotal * 0.96) },
      { day: days[5], count: Math.round(currentTotal * 0.99) },
      { day: days[6], count: currentTotal },
    ];

    const x = d3
      .scalePoint()
      .domain(trendData.map((d) => d.day))
      .range([0, innerWidth]);

    const yMin = (d3.min(trendData, (d) => d.count) || 300) * 0.92;
    const yMax = (d3.max(trendData, (d) => d.count) || 500) * 1.05;
    const y = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // Gradient for area
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'networkAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#fcde6d').attr('stop-opacity', 0.45);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#fcde6d').attr('stop-opacity', 0.0);

    // Area generator
    const area = d3
      .area<{ day: string; count: number }>()
      .x((d) => x(d.day) || 0)
      .y0(innerHeight)
      .y1((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3
      .line<{ day: string; count: number }>()
      .x((d) => x(d.day) || 0)
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // Render area
    g.append('path').datum(trendData).attr('fill', 'url(#networkAreaGrad)').attr('d', area);

    // Render line
    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#756100')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Points
    g.selectAll('.dot')
      .data(trendData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.day) || 0)
      .attr('cy', (d) => y(d.count))
      .attr('r', 3.5)
      .attr('fill', '#141416')
      .attr('stroke', '#fcde6d')
      .attr('stroke-width', 2);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select('.domain').attr('stroke', '#e5e7eb'))
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#6b7280');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#9ca3af');
  }, [analytics, timeframe]);

  const handleAcknowledgeAlert = (id: string, title: string) => {
    hospitalManagementService.acknowledgeAlert(id);
    onTriggerToast(`Alert acknowledged: ${title}. Event logged.`);
  };

  return (
    <div className="space-y-6">
      {/* 4 Primary Top Aggregated Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Patients */}
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Total Patients across Network
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {analytics.totalPatients}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  +12 Today
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <span className="material-symbols-outlined text-[22px]">personal_injury</span>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
            <span>Aggregated across {hospitals.length} hospitals</span>
            <span className="font-mono text-emerald-700 font-bold">Live Synced</span>
          </div>
        </div>

        {/* Metric 2: Average Occupancy Rate */}
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Average Occupancy Rate
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {analytics.avgOccupancyRate}%
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analytics.avgOccupancyRate > 85
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-[#fcde6d]/50 text-[#756100]'
                  }`}
                >
                  {analytics.avgOccupancyRate > 85 ? 'High Demand' : 'Target Zone'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-[22px]">hotel</span>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
            <span>{analytics.totalOccupied} of {analytics.totalCapacity} beds filled</span>
            <span className="font-mono text-neutral-700 font-bold">80% NABH Benchmark</span>
          </div>
        </div>

        {/* Metric 3: Active Medical Specialists */}
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Total Medical Workforce
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-blue-900 font-['Plus_Jakarta_Sans']">
                  {analytics.totalDoctors + analytics.totalStaff}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {analytics.totalDoctors} Docs
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
              <span className="material-symbols-outlined text-[22px]">medical_services</span>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
            <span>{analytics.totalStaff} Nurses &amp; Techs</span>
            <span className="font-mono text-blue-800 font-bold">1:1.2 Ratio</span>
          </div>
        </div>

        {/* Metric 4: Recent System Alerts */}
        <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Active System Alerts
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-rose-600 font-['Plus_Jakarta_Sans']">
                  {activeAlertsCount}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                  Requires Attention
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700">
              <span className="material-symbols-outlined text-[22px]">notification_important</span>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
            <span>Critical protocols &amp; stocks</span>
            <span className="font-mono text-rose-700 font-bold">Real-time Feed</span>
          </div>
        </div>
      </div>

      {/* D3 Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: Total Patients by Hospital (D3 Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-800 text-[19px]">bar_chart</span>
                Total Patients across Hospitals (D3 Census Visualization)
              </h3>
              <p className="text-xs text-neutral-500">
                Comparative inpatient volume and active bed census per hospital node. Hover for details.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-semibold self-start sm:self-auto">
              D3.js SVG Dynamic Scaled
            </span>
          </div>

          {/* D3 Bar Chart Canvas */}
          <div className="w-full flex items-center justify-center py-1 overflow-x-auto">
            <svg ref={patientBarChartRef} className="w-full max-w-lg h-auto" />
          </div>

          {/* Hospital quick breakdown footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100">
            {analytics.hospitalBreakdown.map((h) => (
              <div
                key={h.id}
                onClick={() => onNavigateHospitalAdmin && onNavigateHospitalAdmin(h.id)}
                className="p-3 rounded-2xl bg-neutral-50 hover:bg-[#fcde6d]/20 transition-colors border border-black/5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-neutral-500">{h.code}</span>
                    <span className="font-bold text-neutral-900">{h.patientsCount} Pts</span>
                  </div>
                  <div className="font-bold text-xs text-neutral-800 truncate mt-1">{h.name}</div>
                </div>
                <div className="text-[10px] text-neutral-500 mt-2 flex items-center justify-between">
                  <span>Capacity: {h.totalBeds} Beds</span>
                  <span className="font-bold text-neutral-700">{h.occupancyRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: Average Occupancy Rate (D3 Radial Donut Gauge) */}
        <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-800 text-[19px]">donut_large</span>
                Network Occupancy Gauge
              </h3>
              <p className="text-xs text-neutral-500">
                Overall system capacity utilization with benchmark threshold lines.
              </p>
            </div>

            {/* D3 Radial Donut */}
            <div className="flex items-center justify-center py-2">
              <svg ref={occupancyDonutRef} className="w-52 h-52" />
            </div>

            {/* Capacity breakdown legend */}
            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#141416]"></span>
                  <span className="text-neutral-700 font-medium">Occupied Inpatient Beds</span>
                </div>
                <span className="font-bold text-neutral-900">{analytics.totalOccupied}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-neutral-300"></span>
                  <span className="text-neutral-700 font-medium">Available Sterilized Beds</span>
                </div>
                <span className="font-bold text-neutral-900">
                  {Math.max(0, analytics.totalCapacity - analytics.totalOccupied)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 text-center pt-2 border-t border-neutral-100">
            Optimum clinical velocity target: <strong>75% - 85%</strong>
          </div>
        </div>
      </div>

      {/* LOWER BENTO: 7-Day Inpatient Trend & Recent System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Inpatient Trajectory Curve (D3 Area/Line) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-neutral-800 text-[19px]">show_chart</span>
                  Inpatient Volume Trajectory
                </h3>
                <p className="text-xs text-neutral-500">7-Day network aggregated admission census.</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#fcde6d]/30 text-[#756100] font-bold">
                7D Rolling
              </span>
            </div>

            <div className="flex items-center justify-center py-2">
              <svg ref={trendLineRef} className="w-full h-auto" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#faf8f4] border border-black/5 text-xs flex items-center justify-between">
            <span className="text-neutral-600">Net 7-Day Patient Growth:</span>
            <span className="text-emerald-700 font-bold">+9.8% (+38 Inpatients)</span>
          </div>
        </div>

        {/* RECENT SYSTEM ALERTS STREAM */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[20px]">warning</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Recent System Alerts &amp; Clinical Threshold Exceptions
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Aggregated cross-hospital alert radar tracking blood bank reserves, ICU bed surges, and equipment calibrations.
              </p>
            </div>

            {/* Severity Filter Pills */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
              {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                    selectedSeverity === sev
                      ? 'bg-[#141416] text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No system alerts found for severity: {selectedSeverity}.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';
                const isResolved = alert.status === 'RESOLVED';
                const isAcknowledged = alert.status === 'ACKNOWLEDGED';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : isWarning
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {alert.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">{alert.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">• {alert.timestamp}</span>
                      </div>

                      <p className="text-xs text-neutral-700 leading-relaxed">{alert.message}</p>

                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5">
                        <span className="material-symbols-outlined text-[13px] text-neutral-400">domain</span>
                        <span>{alert.hospitalName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                      {alert.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id, alert.title)}
                          className="px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Acknowledge
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-white/80 text-neutral-700 text-xs font-semibold border border-black/5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-emerald-600 text-[14px]">done_all</span>
                          {alert.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
