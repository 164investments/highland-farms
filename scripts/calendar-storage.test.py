"""Disposable, local-only PostgreSQL tests for calendar and Stripe compatibility.

Requires initdb/postgres/psql on PATH. Reads no credentials and connects only to
its own temporary Unix socket. Invoke on the shared Mac through
local-build-guard.py --required-gib 0.1. Process and fixture clean up in finally.
All appointments are fictional; no external requests or live database writes.
"""
import concurrent.futures,json,pathlib,shutil,subprocess,tempfile,time
repo=pathlib.Path(__file__).resolve().parents[1]
root=pathlib.Path(tempfile.mkdtemp(prefix='hf-calendar-pg-'));pg=None

def sql(s):
 r=subprocess.run(['psql','-X','-v','ON_ERROR_STOP=1','-At','-h',str(root),'-p','55444','-d','postgres','-c',s],text=True,capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr.strip())
 return r.stdout.strip()
def q(s):return "'"+str(s).replace("'","''")+"'"
def obj(o):return q(json.dumps(o))+'::jsonb'
def claim(n,slug='farm-tour',start='2027-01-01T18:00:00Z',party=2,capacity=999):
 leg=dict(product_slug=slug,starts_at=start,party_size=party,capacity=capacity,amount_cents=0,duration_min=1,padding_before_min=0,padding_after_min=0,units=1,max_daily_appointments=999)
 b=dict(booking_number=n,first_name='Fixture',last_name='Guest',email='fixture@example.invalid',phone='5035550000')
 return sql('select claim_booking_slots('+obj([leg])+','+obj(b)+')')
def fail(fn,match):
 try:fn()
 except RuntimeError as e:assert match in str(e),str(e)
 else:raise AssertionError('expected '+match)
def eq(s,want):
 got=sql(s);assert got==str(want),(got,want,s)
def clear():sql('truncate bookings,booking_timed_blackouts,booking_blackouts cascade')
try:
 subprocess.run(['initdb','-D',str(root/'db'),'-A','trust','--no-locale'],check=True,stdout=subprocess.DEVNULL)
 with open(root/'server.log','w') as log:pg=subprocess.Popen(['postgres','-D',str(root/'db'),'-k',str(root),'-p','55444','-c','listen_addresses='],stdout=log,stderr=log)
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:
   if pg.poll() is not None:raise RuntimeError((root/'server.log').read_text())
   time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role bypassrls;')
 for name in ['supabase-shop.sql','supabase-shop-sync.sql','supabase-booking.sql','supabase-stripe.sql','supabase-calendar.sql']:
  sql((repo/name).read_text())
 for name in ['supabase-stripe.sql','supabase-calendar.sql']:
  sql((repo/name).read_text())
 eq("select relrowsecurity from pg_class where relname='booking_timed_blackouts'",'t')
 eq("select has_table_privilege('anon','booking_timed_blackouts','select') or has_function_privilege('anon','claim_booking_slots(jsonb,jsonb)','execute')",'f')
 eq("select has_table_privilege('authenticated','booking_timed_blackouts','insert') or has_sequence_privilege('anon','booking_timed_blackouts_id_seq','usage')",'f')
 print('PASS calendar migration re-runnable, timed blackout RLS and private RPC ACL',flush=True)
 sql("insert into booking_timed_blackouts(starts_at,ends_at,product_slugs) values('2027-01-01T18:30Z','2027-01-01T19:15Z',array['farm-tour'])")
 fail(lambda:claim('blocked10'),'slot blocked');fail(lambda:claim('blocked11',start='2027-01-01T19:00Z'),'slot blocked');claim('allowed12',start='2027-01-01T20:00Z')
 clear();claim('call10','wedding-call',party=1)
 eq("select duration_min||':'||padding_before_min||':'||padding_after_min from bookings",'45:5:15')
 fail(lambda:claim('call11','wedding-call','2027-01-01T19:00Z',1),'slot full');claim('call1105','wedding-call','2027-01-01T19:05Z',1)
 print('PASS partial timed closures and trusted call duration/buffers with exact half-open boundary',flush=True)
 clear();claim('tour1');claim('tour2');fail(lambda:claim('tour3'),'slot full')
 clear()
 for i in range(6):claim('daily'+str(i),start='2027-01-01T'+str(8+i).zfill(2)+':00Z')
 sql("update bookings set status=case when booking_number='daily0' then 'completed' when booking_number='daily1' then 'no_show' else 'confirmed' end")
 fail(lambda:claim('daily7',start='2027-01-01T23:00Z'),'daily appointment limit')
 sql("update bookings set status='cancelled' where booking_number='daily0'");claim('daily7',start='2027-01-01T23:00Z')
 print('PASS fixed tour resource cap2 and Pacific daily cap6 including completed/no-show; cancelled frees cap',flush=True)
 clear();claim('spa1','nordic-spa',party=6);fail(lambda:claim('spa2','nordic-spa',party=1),'slot full');claim('spa3','nordic-spa','2027-01-01T18:30Z',6)
 sql("insert into booking_timed_blackouts(starts_at,ends_at,product_slugs) values('2027-01-02T18:30Z','2027-01-02T19:15Z',array['nordic-spa'])")
 fail(lambda:claim('spa-block','nordic-spa','2027-01-02T18:00Z',1),'slot blocked')
 print('PASS independent exact-start spa class seats and explicit native spa timed closures',flush=True)
 clear();claim('short1',start='2027-01-01T18:00Z');claim('short2',start='2027-01-01T18:30Z')
 sql('update bookings set duration_min=30');claim('peak',start='2027-01-01T18:00Z')
 clear();claim('finalization','wedding-call',party=1);sql('update bookings set duration_min=60,padding_before_min=0,padding_after_min=0')
 fail(lambda:claim('long-overlap','wedding-call','2027-01-01T18:50Z',1),'slot full')
 print('PASS peak concurrency allows consecutive source bookings; imported actual60min protects overlap',flush=True)
 clear()
 def race(i):
  try:claim('race'+str(i),start='2027-01-03T'+str(8+i).zfill(2)+':00Z');return True
  except RuntimeError as e:assert 'daily appointment limit' in str(e),str(e);return False
 with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:results=list(pool.map(race,range(7)))
 assert sum(results)==6,results
 clear()
 for i in range(5):claim('seed'+str(i),start='2027-01-03T'+str(8+i).zfill(2)+':00Z')
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(race,[5,6]))
 assert sum(results)==1,results
 clear()
 def midnight(i):
  try:claim('midnight'+str(i),'wedding-call',['2027-01-04T07:50Z','2027-01-04T08:15Z'][i],1);return True
  except RuntimeError as e:assert 'slot full' in str(e),str(e);return False
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(midnight,range(2)))
 assert sum(results)==1,results
 print('PASS concurrent different-start daily claims and buffered midnight cross-date resource locking',flush=True)
 clear()
 sql("insert into gift_certificates(code,kind,initial_units,remaining_units) values('FIXTURE-COMBO','value',20000,20000)")
 customer=dict(booking_number='fixture-combo',first_name='Fixture',last_name='Guest',email='fixture@example.invalid',phone='5035550000')
 legs=[dict(product_slug=slug,starts_at=start,party_size=2,capacity=6,amount_cents=15000) for slug,start in [('farm-tour','2027-02-01T18:00Z'),('nordic-spa','2027-02-01T21:00Z')]]
 attempt=json.loads(sql('select reserve_stripe_checkout('+obj(dict(kind='booking',idempotency_key='fixture-combo',request_hash='fixture-combo',reference='fixture-combo',amount_cents=30000,snapshot=dict(customer=customer,legs=legs,giftCode='FIXTURE-COMBO')))+')'))
 assert attempt['due_cents']==10000 and attempt['gift_units']==20000,attempt
 sql('select claim_stripe_attempt('+q(attempt['id'])+",'pi_fixture_calendar')")
 sql('select finish_stripe_checkout('+q(attempt['id'])+",'pi_fixture_calendar',10000)")
 eq("select count(*) from bookings where status='confirmed' and combo_group is not null",2)
 eq("select remaining_units from gift_certificates where code='FIXTURE-COMBO'",0)
 print('PASS combined Stripe reserve/gift/combo claim and atomic finalization with calendar RPC',flush=True)
 sql("insert into gift_certificates(code,kind,product_scope,initial_units,remaining_units) values('SCOPED-COMBO','value','combo',60000,60000),('INVALID-COMBO-VISITS','visits','combo',3,3)")
 def scoped(name,selected,code='SCOPED-COMBO'):
  customer=dict(booking_number=name,first_name='Fixture',last_name='Guest',email='fixture@example.invalid',phone='5035550000')
  legs=[dict(product_slug=slug,starts_at='2027-03-01T'+str(18+index*3).zfill(2)+':00Z',party_size=2,capacity=6,amount_cents=15000) for index,slug in enumerate(selected)]
  request=dict(kind='booking',idempotency_key=name,request_hash=name,reference=name,amount_cents=15000*len(legs),snapshot=dict(customer=customer,legs=legs,giftCode=code))
  return json.loads(sql('select reserve_stripe_checkout('+obj(request)+')'))
 fail(lambda:scoped('reject-wedding',['wedding-call']),'not usable')
 fail(lambda:scoped('reject-combo-visits',['farm-tour','nordic-spa'],'INVALID-COMBO-VISITS'),'not usable')
 for name,selected in [('separate-tour',['farm-tour']),('separate-spa',['nordic-spa']),('scoped-combo',['farm-tour','nordic-spa'])]:
  attempt=scoped(name,selected)
  assert attempt['due_cents']==0 and attempt['gift_units']==15000*len(selected),attempt
  sql('select claim_stripe_attempt('+q(attempt['id'])+',null)')
  sql('select finish_stripe_checkout('+q(attempt['id'])+',null,0)')
 eq("select remaining_units from gift_certificates where code='SCOPED-COMBO'",0)
 eq("select count(*) from bookings where booking_number like 'reject-%'",0)
 print('PASS combo-value scope permits separate tour/spa and combined bookings, rejects wedding and combo-visits atomically',flush=True)
 for suffix,expiry in [('EXPIRING',180),('PERMANENT',None)]:
  product=dict(kind='visits',productScope='nordic-spa',units=3,amountCents=19900)
  if expiry is not None:product['expiryDays']=expiry
  request=dict(kind='gift',idempotency_key='gift-'+suffix,request_hash='gift-'+suffix,reference='gift-'+suffix,amount_cents=19900,snapshot=dict(code=suffix,product=product,purchaserEmail='fixture@example.invalid'))
  attempt=json.loads(sql('select reserve_stripe_checkout('+obj(request)+')'))
  sql('select claim_stripe_attempt('+q(attempt['id'])+','+q('pi_'+suffix)+')')
  sql('select finish_stripe_checkout('+q(attempt['id'])+','+q('pi_'+suffix)+',19900)')
  if expiry is None:
   eq("select expires_at is null from gift_certificates where code='PERMANENT'",'t')
   eq("select result->>'expiresAt' is null from stripe_checkout_attempts where reference='gift-PERMANENT'",'t')
  else:
   eq("select g.expires_at=a.created_at+interval '180 days' and (a.result->>'expiresAt')::timestamptz=g.expires_at from gift_certificates g join stripe_checkout_attempts a on a.id=g.stripe_attempt_id where g.code='EXPIRING'",'t')
 print('PASS 180-day pack expiry and receipt agree; absent expiry preserves permanent certificates',flush=True)
finally:
 if pg:
  pg.terminate()
  try:pg.wait(timeout=10)
  except subprocess.TimeoutExpired:pg.kill();pg.wait()
 shutil.rmtree(root)
