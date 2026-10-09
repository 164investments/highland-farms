"""Real PostgreSQL regression checks against a disposable, local-only cluster.

Requires initdb/postgres/psql on PATH. Never reads credentials or connects to a
configured database. The process and temporary cluster are removed in finally.
On the shared Mac, invoke through local-build-guard.py --required-gib 0.1.
"""
import concurrent.futures, json, pathlib, shutil, subprocess, tempfile, time

REPO = pathlib.Path(__file__).resolve().parents[1]
root = pathlib.Path(tempfile.mkdtemp(prefix='hf-stripe-pg-'))
pg = None
def sql(s):
    r = subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-h', str(root), '-p', '55443', '-d', 'postgres', '-c', s], text=True, capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()
def quote(x): return "'" + str(x).replace("'", "''") + "'"
def obj(x): return quote(json.dumps(x)) + '::jsonb'
def assertq(s, expected):
    actual = sql(s)
    assert actual == str(expected), (s, actual, expected)
def reserve(kind, key, amount, snapshot):
    return json.loads(sql('select reserve_stripe_checkout(' + obj(dict(kind=kind, idempotency_key=key, request_hash=key, reference=key, amount_cents=amount, snapshot=snapshot)) + ')'))
def shop(key, qty=1):
    return dict(order=dict(order_number=key, fulfillment='pickup', customer_name='Fixture', customer_email='fixture@example.invalid', customer_phone='5035550000', subtotal_cents=qty*100, delivery_fee_cents=0, total_cents=qty*100), items=[dict(variant_id='fixture', product_slug='fixture', product_name='Fixture', unit_price_cents=100, quantity=qty)])
def booking(key, code=None, party=2, slug='nordic-spa'):
    return dict(customer=dict(booking_number=key, first_name='Fixture', last_name='Test', email='fixture@example.invalid', phone='5035550000'), legs=[dict(product_slug=slug, starts_at='2027-01-01T20:00:00Z', duration_min=90, capacity=100, party_size=party, units=party, amount_cents=party*7500)], giftCode=code)
def fail(s, match):
    try: sql(s)
    except RuntimeError as e:
        assert match in str(e), str(e)
    else: raise AssertionError('expected failure: '+s)
try:
    subprocess.run(['initdb', '-D', str(root/'db'), '-A', 'trust', '--no-locale'], check=True, stdout=subprocess.DEVNULL)
    with open(root/'server.log', 'w') as log:
        pg = subprocess.Popen(['postgres', '-D', str(root/'db'), '-k', str(root), '-p', '55443', '-c', 'listen_addresses='], stdout=log, stderr=log)
    for _ in range(100):
        try: sql('select 1'); break
        except RuntimeError:
            if pg.poll() is not None: raise RuntimeError((root/'server.log').read_text())
            time.sleep(.1)
    sql('create role anon; create role authenticated; create role service_role bypassrls;')
    for name in ['supabase-shop.sql', 'supabase-shop-sync.sql', 'supabase-booking.sql', 'supabase-stripe.sql']:
        sql((REPO/name).read_text())
    sql((REPO/'supabase-stripe.sql').read_text())
    print('PASS migration creates schema/RPCs and is re-runnable', flush=True)
    sql("insert into shop_inventory(variant_id,stock,square_variation_id) values ('fixture',5,'fixture-square');")
    a = reserve('shop','shop-a',200,shop('shop-a',2)); aid=quote(a['id'])
    assertq("select stock from shop_inventory where variant_id='fixture'", 3)
    again = reserve('shop','shop-a',200,shop('shop-a',2)); assert again['id']==a['id']
    assertq("select stock from shop_inventory where variant_id='fixture'", 3)
    fail('select reserve_stripe_checkout('+obj(dict(kind='shop',idempotency_key='shop-a',request_hash='changed',reference='unused',amount_cents=100,snapshot=shop('unused')))+')', 'different request')
    assertq("select sync_square_stock('fixture-square',5)", 1)
    assertq("select stock from shop_inventory where variant_id='fixture'", 3)
    sql('select expire_stripe_checkout('+aid+')')
    sql('select expire_stripe_checkout('+aid+')')
    assertq("select stock from shop_inventory where variant_id='fixture'", 5)
    print('PASS idempotency/hash binding, Square held-stock subtraction, exactly-once expiry',flush=True)
    a = reserve('shop','shop-shortfall',100,shop('shop-shortfall')); aid=quote(a['id'])
    sql("select sync_square_stock('fixture-square',0)")
    assertq("select stock || ':' || stripe_stock_shortfall from shop_inventory where variant_id='fixture'", '0:1')
    sql('select expire_stripe_checkout('+aid+')')
    assertq("select stock || ':' || stripe_stock_shortfall from shop_inventory where variant_id='fixture'", '0:0')
    print('PASS POS consumption of held units never invents stock on expiry',flush=True)
    sql("select sync_square_stock('fixture-square',5)")
    a = reserve('shop','shop-paid',100,shop('shop-paid')); aid=quote(a['id'])
    sql('select attach_stripe_session('+aid+",'cs_fixture')")
    assertq('select claim_stripe_attempt('+aid+",'pi_fixture')->>'acquired'", 'true')
    assertq('select claim_stripe_attempt('+aid+",'pi_fixture')->>'acquired'", 'false')
    fail('select finish_stripe_checkout('+aid+",'pi_fixture',99)", 'amount or payment')
    fail('select finish_stripe_checkout('+aid+",'pi_wrong',100)", 'amount or payment')
    sql('select finish_stripe_checkout('+aid+",'pi_fixture',100)")
    sql('select finish_stripe_checkout('+aid+",'pi_fixture',100)")
    sql('select expire_stripe_checkout('+aid+')')
    assertq("select count(*) from shop_orders where order_number='shop-paid'",1)
    assertq("select count(*) from shop_order_items i join shop_orders o on o.id=i.order_id where o.order_number='shop-paid'",1)
    assertq("select square_payment_id is null and stripe_payment_intent_id='pi_fixture' from shop_orders where order_number='shop-paid'",'t')
    assertq('select set_stripe_effects_data('+aid+','+obj(dict(meetLink='first'))+") ->> 'meetLink'",'first')
    assertq('select set_stripe_effects_data('+aid+','+obj(dict(meetLink='changed'))+") ->> 'meetLink'",'first')
    sql("select sync_square_stock('fixture-square',5)")
    assertq("select stock from shop_inventory where variant_id='fixture'",4)
    sql('update stripe_checkout_attempts set square_synced_at=now() where id='+aid)
    sql("select sync_square_stock('fixture-square',4)")
    assertq("select stock from shop_inventory where variant_id='fixture'",4)
    print('PASS claim lease, amount/PI binding, atomic paid order, repeat finalization, frozen effects and Square-sync marker',flush=True)
    sql("insert into gift_certificates(code,kind,product_scope,initial_units,remaining_units) values ('VALUE','value','nordic-spa',20000,20000),('VISITS','visits','nordic-spa',3,3)")
    a=reserve('booking','booking-value',15000,booking('booking-value','VALUE'));aid=quote(a['id'])
    free_booking_id=a['id']
    assert a['due_cents']==0 and a['gift_units']==15000
    assertq('select claim_stripe_attempt('+aid+",null)->>'acquired'",'true')
    sql('select finish_stripe_checkout('+aid+',null,0)')
    assertq("select remaining_units from gift_certificates where code='VALUE'",5000)
    assertq("select status || ':' || gift_amount_cents from bookings where booking_number='booking-value'",'confirmed:15000')
    a=reserve('booking','booking-visits',15000,booking('booking-visits','VISITS'));aid=quote(a['id'])
    assert a['gift_units']==2 and a['gift_applied_cents']==15000 and a['due_cents']==0
    sql('select claim_stripe_attempt('+aid+',null)')
    sql('update stripe_checkout_attempts set processing_until=now()-interval \'1 minute\' where id='+aid)
    assertq('select claim_stripe_attempt('+aid+",null)->>'acquired'",'true')
    sql('select expire_stripe_checkout('+aid+')')
    sql('select expire_stripe_checkout('+aid+')')
    assertq("select remaining_units from gift_certificates where code='VISITS'",3)
    assertq("select count(*) from bookings where booking_number='booking-visits'",0)
    fail('select reserve_stripe_checkout('+obj(dict(kind='booking',idempotency_key='wrong-scope',request_hash='wrong-scope',reference='wrong-scope',amount_cents=15000,snapshot=booking('wrong-scope','VISITS',slug='farm-tour')))+')','not usable')
    assertq("select count(*) from bookings where booking_number='wrong-scope'",0)
    a=reserve('booking','booking-expired',15000,booking('booking-expired'));aid=quote(a['id'])
    sql('update stripe_checkout_attempts set expires_at=now()-interval \'1 minute\' where id='+aid)
    sql("update bookings set hold_expires_at=now()-interval '1 minute' where booking_number='booking-expired'")
    assertq('select claim_stripe_attempt('+aid+",'pi_expired')->>'acquired'",'false')
    assertq('select sweep_expired_booking_holds()',0)
    assertq("select count(*) from bookings where booking_number='booking-expired'",1)
    sql('select expire_stripe_checkout('+aid+')')
    print('PASS atomic gifts, free finalization, scope rollback, processing expiry/restoration, expired-claim refusal and sweep protection',flush=True)
    a=reserve('gift','gift-paid',19900,dict(code='ISSUED',product=dict(kind='visits',productScope='nordic-spa',units=3,amountCents=19900),purchaserEmail='fixture@example.invalid'));aid=quote(a['id'])
    sql('select claim_stripe_attempt('+aid+",'pi_gift')")
    sql('select finish_stripe_checkout('+aid+",'pi_gift',19900)")
    sql('select finish_stripe_checkout('+aid+",'pi_gift',19900)")
    assertq("select count(*) from gift_certificates where code='ISSUED' and remaining_units=3 and square_payment_id is null and stripe_payment_intent_id='pi_gift'",1)
    assertq("select record_stripe_refund('pi_unknown',100)",'f')
    assertq("select record_stripe_refund('pi_fixture',40)",'t')
    assertq("select record_stripe_refund('pi_fixture',20)",'t')
    assertq("select status || ':' || refunded_cents from shop_orders where order_number='shop-paid'",'partially_refunded:40')
    sql("select record_stripe_refund('pi_fixture',100)")
    assertq("select status || ':' || refunded_cents from shop_orders where order_number='shop-paid'",'refunded:100')
    fail("select record_stripe_refund('pi_fixture',101)",'outside captured')
    sql("select record_stripe_refund('pi_gift',10000)")
    assertq("select status || ':' || remaining_units || ':' || refunded_cents from gift_certificates where code='ISSUED'",'active:3:10000')
    sql("insert into gift_certificates(code,kind,initial_units,remaining_units) values ('COMBO','value',10000,10000)")
    combo=booking('booking-combo','COMBO')
    combo['legs'].append(dict(combo['legs'][0],product_slug='farm-tour'))
    a=reserve('booking','booking-combo',30000,combo);aid=quote(a['id'])
    combo_attempt_id=a['id']
    assert a['due_cents']==20000 and a['gift_applied_cents']==10000
    sql('select claim_stripe_attempt('+aid+",'pi_combo')")
    # The refund event can arrive before local fulfillment commits.
    sql("select record_stripe_refund('pi_combo',15000)")
    sql('select finish_stripe_checkout('+aid+",'pi_combo',20000)")
    assertq("select sum(refunded_cents) from bookings where stripe_payment_intent_id='pi_combo'",15000)
    assertq("select string_agg(refunded_cents::text,',' order by booking_number) from bookings where stripe_payment_intent_id='pi_combo'",'5000,10000')
    sql("select record_stripe_refund('pi_combo',10000)")
    assertq("select sum(refunded_cents) from bookings where stripe_payment_intent_id='pi_combo'",15000)
    sql("select record_stripe_refund('pi_combo',20000)")
    assertq("select sum(refunded_cents) from bookings where stripe_payment_intent_id='pi_combo'",20000)
    assertq("select count(*) from bookings where stripe_payment_intent_id='pi_combo' and status='confirmed'",2)
    a=reserve('gift','gift-refunded-before-finish',19900,dict(code='ISSUED-REFUND',product=dict(kind='visits',productScope='nordic-spa',units=3,amountCents=19900),purchaserEmail='fixture@example.invalid'));aid=quote(a['id'])
    sql('select claim_stripe_attempt('+aid+",'pi_gift_refund')")
    sql("select record_stripe_refund('pi_gift_refund',19900)")
    sql('select finish_stripe_checkout('+aid+",'pi_gift_refund',19900)")
    assertq("select refunded_cents from gift_certificates where code='ISSUED-REFUND'",19900)
    print('PASS monotonic cumulative refunds, amount bounds, pre-fulfillment refunds, exact combo cash allocation, and unchanged booking/gift domain status',flush=True)
    assertq("select count(*) from bookings where stripe_attempt_id="+quote(free_booking_id),1)
    assertq("select count(*) from gift_certificates where stripe_attempt_id="+aid,1)
    def cancel(attempt_id):
        return json.loads(sql('select cancel_stripe_booking('+quote(attempt_id)+",'fixture cancellation')"))
    sql("update bookings set status='completed' where id=(select id from bookings where stripe_payment_intent_id='pi_combo' order by booking_number limit 1)")
    fail('select cancel_stripe_booking('+quote(combo_attempt_id)+",'consumed fixture')",'missing, consumed')
    assertq("select count(*) from bookings where stripe_payment_intent_id='pi_combo' and status='confirmed'",1)
    assertq("select remaining_units from gift_certificates where code='COMBO'",0)
    sql("update bookings set status='confirmed' where stripe_payment_intent_id='pi_combo'")
    sql("update bookings set stripe_attempt_id=null where id=(select id from bookings where stripe_payment_intent_id='pi_combo' order by booking_number limit 1)")
    fail('select cancel_stripe_booking('+quote(combo_attempt_id)+",'association fixture')",'belongs to another')
    sql("update bookings set stripe_attempt_id="+quote(combo_attempt_id)+" where stripe_payment_intent_id='pi_combo'")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        cancellations=list(pool.map(cancel,[combo_attempt_id]*2))
    assert sorted(len(c['cancelledIds']) for c in cancellations)==[0,2],cancellations
    assert sum(c['giftRestored'] for c in cancellations)==1,cancellations
    assertq("select remaining_units from gift_certificates where code='COMBO'",10000)
    assertq("select count(*) from bookings where stripe_payment_intent_id='pi_combo' and status='cancelled'",2)
    assertq("select count(*) from booking_audit where action='stripe_booking_cancelled'",2)
    cancellation=cancel(free_booking_id)
    assert len(cancellation['cancelledIds'])==1 and cancellation['giftRestored']
    assert cancel(free_booking_id)['cancelledIds']==[]
    assertq("select remaining_units from gift_certificates where code='VALUE'",20000)
    print('PASS concurrent whole-combo cancellation restores gift once, audits both legs, and handles zero-charge attempt IDs',flush=True)
    assertq("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like '%stripe%' or p.proname in ('sync_square_stock','sync_square_stock_snapshot')) and has_function_privilege('anon',p.oid,'execute')",0)
    assertq("select relrowsecurity from pg_class where relname='stripe_checkout_attempts'",'t')
    print('PASS exactly-once gift issuance, Stripe/Square field separation, private RPC ACLs and RLS',flush=True)
    sql("select sync_square_stock('fixture-square',1)")
    def race(key):
        try: return reserve('shop',key,100,shop(key))
        except RuntimeError as e: return str(e)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        outcomes=list(pool.map(race,['race-a','race-b']))
    assert len([x for x in outcomes if isinstance(x,dict)]) == 1, outcomes
    assert any(isinstance(x,str) and 'insufficient stock' in x for x in outcomes), outcomes
    assertq("select stock from shop_inventory where variant_id='fixture'",0)
    winner=next(x for x in outcomes if isinstance(x,dict))
    sql('select expire_stripe_checkout('+quote(winner['id'])+')')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        outcomes=list(pool.map(race,['race-same']*6))
    assert all(isinstance(x,dict) for x in outcomes),outcomes
    assert len({x['id'] for x in outcomes})==1,outcomes
    assertq("select stock from shop_inventory where variant_id='fixture'",0)
    print('PASS concurrent last-unit checkout permits one winner; six same-key retries share one reservation',flush=True)
    sql('select expire_stripe_checkout('+quote(outcomes[0]['id'])+')')
    sql("select sync_square_stock('fixture-square',2)")
    one=reserve('shop','held-one',100,shop('held-one'))
    two=reserve('shop','held-two',100,shop('held-two'))
    sql("select sync_square_stock('fixture-square',1)")
    assertq('select claim_stripe_attempt('+quote(one['id'])+",'pi_held_one')->>'acquired'",'false')
    sql('select expire_stripe_checkout('+quote(one['id'])+')')
    assertq("select stock || ':' || stripe_stock_shortfall from shop_inventory where variant_id='fixture'",'0:0')
    assertq('select claim_stripe_attempt('+quote(two['id'])+",'pi_held_two')->>'acquired'",'true')
    sql("select sync_square_stock('fixture-square',0)")
    sql('update stripe_checkout_attempts set processing_until=now()-interval \'1 minute\' where id='+quote(two['id']))
    assertq('select claim_stripe_attempt('+quote(two['id'])+",'pi_held_two')->>'acquired'",'true')
    print('PASS POS shortfall refuses capture, verified cancellation absorbs shortfall, next hold proceeds, processing recovery remains possible',flush=True)
    sql("insert into shop_inventory(variant_id,stock,square_variation_id) values('monotonic',10,'monotonic-square')")
    monotonic=shop('monotonic-order');monotonic['items'][0]['variant_id']='monotonic'
    a=reserve('shop','monotonic-order',100,monotonic);aid=quote(a['id'])
    assertq("select sync_square_stock_snapshot('monotonic-square',9,'2026-10-09T20:00:00.123456Z')",1)
    assertq("select stock from shop_inventory where variant_id='monotonic'",8)
    assertq("select sync_square_stock_snapshot('monotonic-square',99,'2026-10-09T20:00:00.123455Z')",-1)
    assertq("select sync_square_stock('monotonic-square',99)",0)
    assertq("select stock from shop_inventory where variant_id='monotonic'",8)
    fail("select sync_square_stock_snapshot('monotonic-square',99,'2026-10-09T20:00:00.123456Z')",'conflicting Square count')
    sql('select claim_stripe_attempt('+aid+",'pi_monotonic')")
    sql('select finish_stripe_checkout('+aid+",'pi_monotonic',100)")
    sql('update stripe_checkout_attempts set square_synced_at=now() where id='+aid)
    assertq("select sync_square_stock_snapshot('monotonic-square',9,'2026-10-09T20:00:00.123456Z')",1)
    assertq("select stock from shop_inventory where variant_id='monotonic'",9)
    def snapshot_race(pair):
        quantity,stamp=pair
        return sql("select sync_square_stock_snapshot('monotonic-square',"+str(quantity)+','+quote(stamp)+')')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(snapshot_race,[(8,'2026-10-09T20:00:00.123458Z'),(9,'2026-10-09T20:00:00.123457Z')]))
    assertq("select stock from shop_inventory where variant_id='monotonic'",8)
    print('PASS source timestamps reject stale/unstamped counts, preserve microseconds, recompute same-stamp holds, and newest concurrent snapshot wins',flush=True)
finally:
    if pg is not None and pg.poll() is None:
        pg.terminate()
        try: pg.wait(timeout=15)
        except subprocess.TimeoutExpired: pg.kill();pg.wait()
    shutil.rmtree(root)
