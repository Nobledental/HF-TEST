import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // serve your SPA

// ROI endpoint (demo)
app.post('/api/roi', (req,res)=>{
  const {claims=0,bill=0,denial=14} = req.body||{};
  const improved = Math.max(denial-7,1);
  const extra = Math.round(claims*bill*((denial-improved)/100)*3);
  res.json({ok:true, improvedDenial: improved, projectedCashIn90d: extra});
});

// Coverage analyze (demo)
// In production you'd parse PDFs; here we echo a mock.
app.post('/api/coverage/analyze', (req,res)=>{
  res.json({
    sumInsured: 1000000,
    room: 'Single',
    copay: '0% (≤55)',
    waiting: '2 yrs (specified)',
    prePost: '30/60 days'
  });
});

// Lead capture
app.post('/api/leads', (req,res)=> res.json({ok:true}));

const port = process.env.PORT || 5173;
app.listen(port, ()=>console.log(`HealthFlo stub listening on http://localhost:${port}`));
