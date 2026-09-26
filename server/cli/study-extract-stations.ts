import fs from 'node:fs/promises';
import mysql, {type RowDataPacket} from 'mysql2/promise';
import {config} from '../config.js';

const DISK_BUDGET=160*1024*1024;
let writtenBytes=0;
async function boundedWrite(file:string,data:unknown){
  const body=JSON.stringify(data); const bytes=Buffer.byteLength(body);
  const disk=await fs.statfs('.');
  if(writtenBytes+bytes>DISK_BUDGET || disk.bavail*disk.bsize<1024*1024*1024+bytes)throw Error('Extraction storage budget exceeded');
  await fs.writeFile(file,body); writtenBytes+=bytes;
}

// Source remains read-only. One station per query avoids server temporary tables.
const c=await mysql.createConnection({host:config.DB_HOST,port:config.DB_PORT,user:config.DB_USERNAME,password:config.DB_PASSWORD,database:config.DB_DATABASE,dateStrings:true,ssl:config.DB_SSL?{}:undefined});
await fs.mkdir('.build/study',{recursive:true});
try {
  for(const kind of ['rain','tma'] as const){
    const table=kind==='rain'?'jakarta_ch':'jakarta_tma';
    const id=kind==='rain'?'ID_LOKASI_PEMANTAUAN':'ID_PINTU_AIR';
    const time=kind==='rain'?'TANGGAL_TERAKHIR':'TANGGAL';
    const value=kind==='rain'?'KETINGGIAN_TERAKHIR':'TINGGI_AIR';
    const name=kind==='rain'?'NAMA_LOKASI_PEMANTAUAN':'NAMA_PINTU_AIR';
    const [ids]=await c.query<RowDataPacket[]>(`SELECT DISTINCT ${id} station_id FROM ${table} WHERE ${id} IS NOT NULL`);
    const output:Record<string,unknown>[]=[];
    let raw=0,duplicates=0,conflicts=0;
    for(const station of ids){
      const [rows]=await c.query<RowDataPacket[]>(`SELECT ${id} station_id,${name} name,${time} observed_at,${value} value,LATITUDE latitude,LONGITUDE longitude ${kind==='rain'?',DAS_POLDER basin':''} FROM ${table} WHERE ${id}=? AND ${time}>='2025-10-21' AND ${time}<'2026-09-02' AND ${value} IS NOT NULL LIMIT 100001`,[station.station_id]);
      if(rows.length>100000)throw Error('Station row limit exceeded; refusing partial extraction');
      raw+=rows.length;
      const unique=new Map<string,{row:RowDataPacket;conflict:boolean}>();
      for(const row of rows){
        if(kind==='rain'&&Number(row.value)<0)continue;
        const previous=unique.get(row.observed_at);
        if(previous){duplicates++;if(Number(previous.row.value)!==Number(row.value))previous.conflict=true;}
        else unique.set(row.observed_at,{row,conflict:false});
      }
      const hours=new Map<string,{row:RowDataPacket;sum:number;count:number}>();
      for(const {row,conflict} of unique.values()){
        if(conflict){conflicts++;continue;}
        const hour=String(row.observed_at).slice(0,13)+':00:00';
        const bin=hours.get(hour)??{row,sum:0,count:0};bin.sum+=Number(row.value);bin.count++;hours.set(hour,bin);
      }
      for(const [hour,bin] of hours)output.push({...bin.row,observed_at:undefined,hour,value:bin.sum/bin.count,copies:bin.count});
    }
    await boundedWrite(`.build/study/${kind}.json`,output);
    await boundedWrite(`.build/study/${kind}-quality.json`,{raw,duplicates,conflicts,hourly_rows:output.length});
    console.log(JSON.stringify({kind,raw,duplicates,conflicts,hourly_rows:output.length}));
  }
  const [events]=await c.query(`SELECT uid,DATE_FORMAT(date_time_of_occurrence,'%Y-%m-%d %H:%i:%s') occurred_at,point_of_occurrence_lat latitude,point_of_occurrence_lon longitude,city FROM pu_sitaba_disaster_report WHERE disaster_category='Banjir' AND date_time_of_occurrence>='2025-10-21' AND date_time_of_occurrence<'2026-09-02' AND point_of_occurrence_lat BETWEEN -6.6 AND -5.8 AND point_of_occurrence_lon BETWEEN 106.5 AND 107.2`);
  await boundedWrite('.build/study/events.json',events);
  console.log(`events: ${(events as unknown[]).length}`);
}catch(e){console.error('Study extraction failed:',(e as {code?:string}).code??'QUERY_ERROR');process.exitCode=1;}finally{await c.end();}
