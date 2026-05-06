--
-- PostgreSQL database dump
--

\restrict mpFSkrde8iQ4VndvIxRyTweAOsxSGyml89ciIY3KmkA8OxlNyXjES5F4kUEEits

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userrole AS ENUM (
    'public',
    'admin',
    'dgp',
    'srp',
    'dsrp',
    'irp',
    'station'
);


ALTER TYPE public.userrole OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.admin OWNER TO postgres;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id character varying NOT NULL,
    alert_type character varying NOT NULL,
    title character varying NOT NULL,
    description character varying NOT NULL,
    priority character varying NOT NULL,
    is_active character varying NOT NULL,
    created_at timestamp with time zone,
    target_station character varying
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: complaints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaints (
    id character varying NOT NULL,
    user_id character varying NOT NULL,
    complaint_type character varying NOT NULL,
    description character varying NOT NULL,
    location character varying NOT NULL,
    station character varying NOT NULL,
    incident_date character varying NOT NULL,
    evidence_urls character varying,
    status character varying NOT NULL,
    rejection_reason character varying,
    tracking_number character varying NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    complainant_name character varying,
    complainant_phone character varying,
    aadhar_number character varying,
    aadhar_file character varying,
    address character varying,
    state character varying,
    complainant_email character varying,
    supporting_docs character varying
);


ALTER TABLE public.complaints OWNER TO postgres;

--
-- Name: crime_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crime_data (
    id character varying NOT NULL,
    crime_type character varying NOT NULL,
    station character varying NOT NULL,
    count integer NOT NULL,
    month character varying NOT NULL,
    year integer NOT NULL
);


ALTER TABLE public.crime_data OWNER TO postgres;

--
-- Name: dgp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dgp (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.dgp OWNER TO postgres;

--
-- Name: dsrp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dsrp (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.dsrp OWNER TO postgres;

--
-- Name: help_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.help_requests (
    id character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    email character varying NOT NULL,
    message character varying NOT NULL,
    status character varying NOT NULL,
    created_at timestamp with time zone,
    replied integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.help_requests OWNER TO postgres;

--
-- Name: irp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.irp (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.irp OWNER TO postgres;

--
-- Name: public_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.public_users (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    role public.userrole NOT NULL,
    created_at timestamp with time zone,
    password character varying NOT NULL
);


ALTER TABLE public.public_users OWNER TO postgres;

--
-- Name: srp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.srp (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.srp OWNER TO postgres;

--
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying NOT NULL,
    password character varying NOT NULL,
    created_at timestamp with time zone,
    role character varying NOT NULL
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- Name: unidentified_bodies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unidentified_bodies (
    id character varying NOT NULL,
    image_url character varying NOT NULL,
    image_file_name character varying NOT NULL,
    station character varying NOT NULL,
    district character varying,
    reported_date character varying NOT NULL,
    description character varying NOT NULL,
    uploaded_by character varying NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.unidentified_bodies OWNER TO postgres;

--
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin (id, email, name, phone, password, created_at) FROM stdin;
6af1d0f0-cc1c-4bdc-afad-caa01d2437db	andhrapradheshgrp@gmail.com	Admin User	9000000100	$2b$12$MUj7GSXvWzjVEPyrnwRze.vwVB/L9Prec2FzfYCgV8B8MB3sFcX4W	2026-04-20 06:37:44.432815
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
20260420_drop_disposition
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, alert_type, title, description, priority, is_active, created_at, target_station) FROM stdin;
ea8e202c-2d47-4f22-a13d-da0faf2a27d0	complaint	New Complaint Filed – GRP0C72E513	Type: theft | Station: Unassigned | Incident: 2026-04-18 | Tracking: GRP0C72E513	high	true	2026-04-18 08:57:20.442388+00	\N
f117d456-afda-4f21-9859-0ba8f1ff1c21	complaint	New Complaint Filed – GRP0F334266	Type: missing_person | Station: Unassigned | Incident: 2026-04-20 | Tracking: GRP0F334266	high	true	2026-04-20 05:23:37.992975+00	\N
722baaf3-aa7c-4a5e-bbe6-7614d6063559	complaint	New Complaint Filed – GRPC84E0796	Type: harassment | Station: Unassigned | Incident: 2026-04-20 | Tracking: GRPC84E0796	high	true	2026-04-20 10:39:37.613655+00	\N
7d914f62-93db-45e1-9c39-bb90b23aad2e	complaint	New Complaint Filed – GRP93836968	Type: theft | Station: Unassigned | Incident: 2026-04-19 | Tracking: GRP93836968	high	true	2026-04-20 11:34:26.237855+00	\N
25ce6354-fc0a-4a6e-8c9f-a1f2f7f16ae5	complaint	New Complaint Filed – GRPAP30C7044B	Type: theft | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAP30C7044B	high	true	2026-04-21 06:00:07.001754+00	\N
3ce546a8-87ce-4e90-8921-a56bbd5648b8	complaint	New Complaint Filed – GRPAP3E8A62CB	Type: theft | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAP3E8A62CB	high	true	2026-04-21 06:00:55.636864+00	\N
80a29f81-7276-455f-a7a5-09009713581c	complaint	New Complaint Filed – GRPAP32EBF542	Type: other | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAP32EBF542	high	true	2026-04-21 07:23:37.415608+00	\N
f4908fc6-3e2e-4412-81f7-c978813c6b46	complaint	New Complaint Filed – GRPAPB9735528	Type: other | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAPB9735528	high	true	2026-04-21 07:36:55.159504+00	\N
3d60ebde-36a5-4c31-ab51-dcb0a1d5eea2	complaint	New Complaint Filed – GRPAPB4CAE62C	Type: harassment | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAPB4CAE62C	high	true	2026-04-21 09:41:11.00426+00	\N
b90a74a5-39c2-4feb-b394-2295b1c26b3c	complaint	New Complaint Filed – GRPAP94EDB2B0	Type: theft | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAP94EDB2B0	high	true	2026-04-21 11:07:44.402196+00	\N
bf2efd4e-22ad-4b38-a88e-9b5ddb91aa84	complaint	New Complaint Filed – GRPAP39F2ED71	Type: theft | Station: Unassigned | Incident: 2026-04-21 | Tracking: GRPAP39F2ED71	high	true	2026-04-21 13:22:46.010285+00	\N
ca8744da-9fd7-4bfa-8adb-4b2556a51f7a	complaint	New Complaint Filed – GRPAP04CA52C7	Type: harassment | Station: Unassigned | Incident: 2026-04-20 | Tracking: GRPAP04CA52C7	high	true	2026-04-21 15:58:03.349025+00	\N
2ca2e47c-ea9b-45c6-a99a-376a31fed44d	complaint	New Complaint Filed – GRPAP53B9C341	Type: missing_person | Station: Unassigned | Incident: 2026-04-22 | Tracking: GRPAP53B9C341	high	true	2026-04-22 09:09:47.584475+00	\N
d2085aca-1b80-4033-b3ae-28ec1facb2e9	complaint	New Complaint Filed – GRPAP9DBD2922	Type: theft | Station: Unassigned | Incident: 2026-04-30 | Tracking: GRPAP9DBD2922	high	true	2026-04-30 10:44:15.865103+00	\N
15c90e8b-5a58-4ad1-9fcf-8819d1bb4ce3	complaint	New Complaint Filed – GRPAP535344A5	Type: other | Station: Unassigned | Incident: 2026-04-29 | Tracking: GRPAP535344A5	high	true	2026-05-03 02:25:31.393641+00	\N
1382d37d-b4c3-45fc-a5b6-9f833659198c	complaint	New Complaint Filed – GRPAPD73F6551	Type: theft | Station: Unassigned | Incident: 2026-05-03 | Tracking: GRPAPD73F6551	high	true	2026-05-03 10:35:14.428485+00	\N
\.


--
-- Data for Name: complaints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.complaints (id, user_id, complaint_type, description, location, station, incident_date, evidence_urls, status, rejection_reason, tracking_number, created_at, updated_at, complainant_name, complainant_phone, aadhar_number, aadhar_file, address, state, complainant_email, supporting_docs) FROM stdin;
01ddee50-ebfd-4c83-afc7-0510092f9bf2	anonymous	theft	i have lost my mobile phone at Guntur Railwaystation....nbjsnkjsanhkjcnaskjn	Guntur Railways Sation	Guntur RPS	2026-04-30		approved	\N	GRPAP9DBD2922	2026-04-30 10:44:15.820718+00	2026-04-30 10:53:15.804313+00	B Raju	9553655688	746594883401	\N	Ongole	\N	battiniraju@gmail.com	
ee0fc1ce-12d0-440c-b465-5e5b9429af33	anonymous	other	Subject: Complaint Regarding Missing Mobile Phone\r\n\r\nRespected Sir/Madam,\r\n\r\nI would like to report that my mobile phone went missing at Vijayawada Railway Station.\r\n\r\nOn 29/04/2026 at around 21:59, while I was boarding the Lingampalli Express (Train No. 17255) along with my wife, my mobile phone was misplaced/lost during the rush in the general coach. I am unable to locate it and suspect it may have been lost during boarding.\r\n\r\nThe details of the mobile phone are as follows:\r\n\r\nModel: Motorola G35\r\nMake: Motorola\r\nIMEI Number: 358557212038050\r\nMobile Number: 9347052495\r\n\r\nI kindly request you to register my complaint and assist in tracing my missing mobile phone.\r\n\r\nThanking you.\r\n\r\nYogesh Bharati	Vijaywada junction	Unassigned	2026-04-29		pending	\N	GRPAP535344A5	2026-05-03 02:25:31.365949+00	2026-05-03 02:25:31.365955+00	Yogesh Devbharti Bharati	9307522894	948407776483	\N	351, Near Shiv Udhyan, Hiwara Ashram - Bramhapuri, Tq : Mehkar Dist : Buldhana , State : Mahrashtra 443301	\N	bharatiyog95@gmail.com	["/complaint_uploads/826c5b8566ec4ef081c96fcc7043fa1e.jpeg", "/complaint_uploads/e1c77702cd2841909b1dfffa989e0d18.pdf", "/complaint_uploads/648126a556fd42c9b17dfe1458f6939b.pdf"]
aeb0087e-d0c3-4d32-b6bd-efe30fd902fc	anonymous	theft	My Blue color Safari backpack was stolen from Train No. 12642 during night. I slept at around 11.30 pm and woke up at around 8.00 am in the morning on 03.05.2026 when I noticed my bag was not there. The bag contains my Samsung Tablet, one titan analog watch, one realme smart watch, my Govt. Office ID Card along with cloth and few items.	Train No 12642	Unassigned	2026-05-03		pending	\N	GRPAPD73F6551	2026-05-03 10:35:14.400101+00	2026-05-03 10:35:14.400107+00	Navneet	7404186231	212825552943	\N	H.No. 822 Hassangarh, Rohtak, Haryana 124404	\N	navneetsharma802@gmail.com	["/complaint_uploads/d2adce87a1184dba9fe858bbf82416a3.jpg", "/complaint_uploads/2870a80d2e514cc59ebb8abf75bdbb69.jpg"]
8d038c62-39e8-4461-adb7-262c479fae0a	anonymous	missing_person	Sir, I would like to inform you that Mr. A. Ramesh, aged 40 years, is missing. He was last seen on 20-04-2026 at Ongole Bus Stand, and since then he has not returned home and is not reachable. We have searched nearby areas and contacted relatives and friends, but we could not find any information about his whereabouts. The missing person was wearing a white coloured shirt and black coloured pant at the time and has the following identification marks: black, curly hair. If he is found, kindly contact us at 9566122355. I request you to take necessary action to trace the missing person at the earliest. Thanking you.	ongole	Ongole RPS	2026-04-22		pending	\N	GRPAP53B9C341	2026-04-22 09:09:47.578151+00	2026-04-22 10:19:08.577269+00	Surendra Babu	7893700389	456123157896	\N	T. Koppera padu\r\nduggirala	\N	babunukathoti.sb@gmail.com	["/complaint_uploads/56863f0afa0b49258d0482d3ec51b773.png", "/complaint_uploads/7f43b8b155e24231a25b441d2c172d6b.png"]
\.


--
-- Data for Name: crime_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crime_data (id, crime_type, station, count, month, year) FROM stdin;
\.


--
-- Data for Name: dgp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dgp (id, email, name, phone, password, role, created_at) FROM stdin;
55ddc1e3-e573-41e8-86fc-1fb08a459fc5	apadgprailways@grp.local	ADGP Railways	9000000000	#Adgp@Railways$	adgp	2026-04-14 17:12:19.139461
42fa03bb-abe8-4782-89be-dc26714af7a5	digrailways@grp.local	DIG Railways	9000000000	#Dig@Railways$	dig	2026-04-14 17:12:19.400137
5b5ee259-56f8-43ec-bdcc-960323d0fe2c	dgpap@grp.local	DGP AP	9000000000	#DGP@AP$	dgp	2026-04-14 17:12:18.878399
\.


--
-- Data for Name: dsrp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dsrp (id, email, name, phone, password, role, created_at) FROM stdin;
83b88613-17d1-4f83-aaa9-c2e6f75734fb	dsrpgtl@gmail.com	DSRP Guntakal	9247575603	#Dsrp@Guntakal$	dsrp	2026-04-14 17:12:21.22994
18368ddd-7e52-4b95-9009-a43ac2b50860	dsprailwaystirupatigrpap@gmail.com	DSRP Tirupati	9247575617	#Dsrp@Tirupati$	dsrp	2026-04-14 17:12:21.490793
a236bc67-06cc-4be2-ba9c-9c3b5f626584	dsrpnellore9@gmail.com	DSRP Nellore	9247575626	#Dsrp@Nellore$	dsrp	2026-04-14 17:12:21.751463
2058b057-34f4-43bc-a791-5c1420e522c0	dsrp.vja@gmail.com	DSRP Vijayawada	9247585709	#Dsrp@Vijayawada$	dsrp	2026-04-14 17:12:20.183384
1aab2af0-015e-4737-97c8-b60fc58c6657	gntdsrpgrpvza@gmail.com	DSRP Guntur	9247585715	#Dsrp@Guntur$	dsrp	2026-04-14 17:12:20.445425
9943441a-fdf1-488a-922a-6f0d12775a78	dsrpofficerjy@gmail.com	DSRP Rajahmundry	9247585725	#Dsrp@Rajahmundry$	dsrp	2026-04-14 17:12:20.706907
5e7f4759-7010-45a7-932d-d463affe6434	dsrp.vskp@gmail.com	DSRP Visakhapatnam	9247585736	#Dsrp@Visakhapatnam$	dsrp	2026-04-14 17:12:20.968251
\.


--
-- Data for Name: help_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.help_requests (id, name, phone, email, message, status, created_at, replied) FROM stdin;
b82023f8-16e8-4d2e-918d-01979d9db853	narayana	8988990090	meta.aihackathon@gmail.com	hi i want to know vijayawada rps number	closed	2026-04-21 15:50:07.989618+00	1
f8b62985-a88b-4fe1-a3b8-b740e084c1d7	B Raju	9553655688	battiniraju29@gmail.com	bsdjhcbajkhhciuashcikuashkjhch	pending	2026-04-30 10:49:59.488513+00	1
ee316fbd-c18b-4fa5-a949-611664f7680d	Yogesh Devbharti Bharati	9307522894	bharatiyog95@gmail.com	Subject: Complaint Regarding Missing Mobile Phone\n\nRespected Sir/Madam,\n\nI would like to report that my mobile phone went missing at Vijayawada Railway Station.\n\nOn 29/04/2026 at around 21:59, while I was boarding the Lingampalli Express (Train No. 17255) along with my wife, my mobile phone was misplaced/lost during the rush in the general coach. I am unable to locate it and suspect it may have been lost during boarding.\n\nThe details of the mobile phone are as follows:\n\nModel: Motorola G35\nMake: Motorola\nIMEI Number: 358557212038050\nMobile Number: 9347052495\n\nI kindly request you to register my complaint and assist in tracing my missing mobile phone.\n\nThanking you.\n\nYogesh Bharati	pending	2026-05-03 02:33:36.920882+00	0
a3c6af4b-99f8-4845-a2c0-3f9c47dc3659	Shashi kiran	9160169198	shashikotla4@gmail.com	Registered a complaint on 12 th of april at GRP tirupati, no fir number was given and no update till date, even the phone is not blocked, need contact number of GRP tirupati and Fir number of my complaint.	pending	2026-05-03 07:17:48.863167+00	0
27a3ef4a-b411-416e-8a04-df52098616cf	Navneet	7404186231	navneetsharma802@gmail.com	I am not able to track the status of my complaint GRPAPD73F6551. Please tell the status and necessary actions to be taken after that. 	pending	2026-05-04 04:39:40.149724+00	0
\.


--
-- Data for Name: irp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.irp (id, email, name, phone, password, role, created_at) FROM stdin;
b45b81d2-1978-4ed3-a38b-e18486824f8c	vijayawadalines@gmail.com	IRP Vijayawada Circle	9247585711	#Irp@Vijayawada$	irp	2026-04-14 17:12:22.272595
3dc843a2-aeb1-410c-94ac-a820c18013b8	shogrpgnt.grpgnt@gmail.com	IRP Guntur	9247585716	#Irp@Guntur$	irp	2026-04-14 17:12:22.533728
68ea5682-4da6-409d-baf1-95bd70572842	irplinesguntur@gmail.com	IRP Guntur Circle	9247585717	#Irp@Guntur$	irp	2026-04-14 17:12:22.79479
031c15ee-0d6e-496a-b01a-c97d5f9ae544	rajahmundrygrp@gmail.com	IRP Rajahmundry	9247585726	#Irp@Rajahmundry$	irp	2026-04-14 17:12:23.056148
7126df8e-d760-4004-9579-9e86360fbee1	kakinadairlines@gmail.com	IRP Kakinada Circle	9247585727	#Irp@Kakinada$	irp	2026-04-14 17:12:23.316553
cb4a7d76-1fe4-47be-948b-a1e9e64c58a0	irpbvrmlinecircle@gmail.com	IRP Bhimavaram Circle	9247585728	#Irp@Bhimavaram$	irp	2026-04-14 17:12:23.577865
c83b09f9-92a7-4fff-9776-2477197cc05e	irpgtlrpccircle@gmail.com	IRP Guntakal Circle	9247575604	#Irp@Guntakal$	irp	2026-04-14 17:12:24.360824
39527f50-c18c-4790-9f37-09d1d68b33ee	iprkurnool@gmail.com	IRP Kurnool Circle	9247575608	#Irp@Kurnool$	irp	2026-04-14 17:12:24.622346
cf66ff2d-559d-4800-863f-1dd4ce67d73b	shokurnoolrps@gmail.com	IRP Dharmavaram Circle	9247575612	#Irp@Dharmavaram$	irp	2026-04-14 17:12:24.884203
a7737ca8-118c-4a63-86f1-a5199e2a0e7a	shotptygtl123@gmail.com	IRP Tirupati Circle	9247575618	#Irp@Tirupati$	irp	2026-04-14 17:12:25.145509
12f17a4f-21ee-4e8d-8e8b-2b98b4d0038b	irprurpc@gmail.com	IRP Renigunta Circle	9247575620	#Irp@Renigunta$	irp	2026-04-14 17:12:25.406643
fb9ab60e-4574-4cda-8a7b-5e1e0efab3ab	irp_kdp_grpgtl@appolice.gov.in	IRP Kadapa Circle	9247575623	#Irp@Kadapa$	irp	2026-04-14 17:12:25.668807
49fbf492-1c9f-467c-ae97-c13505aec308	ongolerpcircle.123@gmail.com	IRP Ongole Circle	9247575631	#Irp@Ongole$	irp	2026-04-14 17:12:26.191425
9ea143a4-9bcd-4331-aec4-212516f9b663	grpsvza@gmail.com	IRP Vijayawada	9247585710	#Irp@Vijayawada$	irp	2026-04-14 17:12:22.012024
686df47f-336d-4221-8f77-e8d0e7d3b65b	shogrpvisakhapatnam@gmail.com	IRP Visakhapatnam	9247585737	#Irp@Visakhapatnam$	irp	2026-04-14 17:12:23.838308
181b4b3d-a279-4255-983c-a9aeb12a990f	irplinesvskp@gmail.com	IRP Visakhapatnam Circle	9247585738	#Irp@Vizianagaram$	irp	2026-04-14 17:12:24.099888
30786c55-679a-4ef4-9a06-2c9d20e76934	grpnellorecircle@gmail.com	IRP Nellore Circle	9247575627	#Irp@Nellore$	irp	2026-04-14 17:12:25.929836
\.


--
-- Data for Name: public_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.public_users (id, email, name, phone, role, created_at, password) FROM stdin;
05c27f84-4ad9-4733-9a56-3eb6b17037d1	battiniraju29@gmail.com	Battini Raju	9553655688	public	2026-04-13 06:57:02.514537+00	$2b$12$mA2L.GOPQ1OqXZUSX3kEW.NQ.I3WtJ0B1AUnf0C/4zUAtYRoVMvOu
\.


--
-- Data for Name: srp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.srp (id, email, name, phone, password, role, created_at) FROM stdin;
a0955e8e-264a-4c7b-abe6-3cc9041da538	srp.guntakal@grp.local	SRP Guntakal	9247575601	#Srp@Guntakal$	srp	2026-04-14 17:12:19.922178
10f973ea-2016-4836-b6f0-4e4b6b6ad704	sprlyvza@gmail.com	SRP Vijayawada	9247585800	#Srp@Vijayawada$	srp	2026-04-14 17:12:19.660938
\.


--
-- Data for Name: stations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stations (id, email, name, phone, password, created_at, role) FROM stdin;
c6541389-2c55-4f0c-9e39-dd89516549c0	vizianagaram.rps@grp.local	Vizianagaram RPS	9247585742	$2b$12$On9NjU06scOQa76JV4.0../5dCUAzt6piLyTqqrOpLxdpu.JFLQK.	2026-04-14 17:12:29.851021+00	station
3231b6e1-730a-4f3a-a97d-63893b678965	yerraguntla.rps@grp.local	Yerraguntla RPS	9247575625	$2b$12$Hj4hAf0kYt2N.gXtCA5wxOIenxLJWN4fuDle.G20K.LgcrfrYdcuO	2026-04-14 17:12:33.767808+00	station
dc57ae2c-aeb9-49ca-a0b3-17bd30a8c568	gudur.rps@grp.local	Gudur RPS	9247575629	$2b$12$t3e/B6hoRv0koAQnRIPUEObqWNZoQwMCRtqf9vq9DPXe0/vuZyxqS	2026-04-14 17:12:34.289935+00	station
f2d0ef3d-95fd-4bb0-8762-203c27992bfe	guntakalrps@gmail.com	Guntakal RPS	9247575605	$2b$12$nLw5pdNE.sXwXrDafMrYf.OvoGkBzY5VL3DiSCw2w3lr/eA5KbQ8O	2026-04-14 17:12:30.373436+00	station
2b9a4c67-e697-4868-8f8f-7d936793fb3f	gootyrps@gmail.com	Gooty RPS	9247575606	$2b$12$N/pgf2f9lC3QKk4rtC58vOi8LzzFxm5kAOb0qjB2klamm8sE9x1yG	2026-04-14 17:12:30.634485+00	station
e5b37525-aafc-432f-bf74-9a38649bc9e1	sho_adn_grpgtl@appolice.gov.in	Adoni RPS	9247575607	$2b$12$aoV75h9F0hJ/BFOKnLj0F.yIY/CPzaI6kmZprEy4jJIdyFupFofqi	2026-04-14 17:12:30.895699+00	station
02c53307-719c-4a81-9b55-c2078bd51533	shokurnoolrps@gmail.com	Kurnool RPS	9247575609	$2b$12$QOSXLoZ1j9rePItT8hP1vOQ5qBJ572Z3VGRVf0noVM2Tu9zk5KD1q	2026-04-14 17:12:31.157114+00	station
49b5ce6a-ae4f-4229-ad84-7272c414d96e	Sho.nandyalrps123@gmail.com	Nandyal RPS	9247575611	$2b$12$MfY984OHhGAQ5EvH01NJJOSR3LUkA8tAmM72pmnG1Kv0I88.4Ks.2	2026-04-14 17:12:31.417806+00	station
a5e58763-add0-4ef1-8455-2c5535c9dac7	sho_atp@grpgtl.appolice.gov.in	Anantapuramu RPS	9247575613	$2b$12$BAEpI0u3kPFBTccPYUsOL.Cl2cT3SsybZGsHBcghjiAwXGG.UqyFy	2026-04-14 17:12:31.939316+00	station
2c26fb99-9439-4791-b037-2cd851d435a6	sho_dmm@grpgtl.appolice.gov.in	Dharmavaram RPS	9247575614	$2b$12$3aYQZqMN7o/TmTsZud8c0utBNydilW/p1keVHiyx.PnyfTMGUETO.	2026-04-14 17:12:31.678671+00	station
5b4d4224-e162-4730-8de7-9ef609b8a645	sho_kdr_grpgtl@appolice.gov.in	Kadiri RPS	9247575616	$2b$12$8kBPDyt2ZTZNTIV8JkAm5.cYy.YnkD6JdPLvFzEXFDyXEhE/LzlBa	2026-04-14 17:12:32.462132+00	station
6d6594ed-a5f5-42f6-a87a-285e482cfeb3	hindupurgrp21@gmail.com	Hindupuramu RPS	9247575615	$2b$12$HNEVm4NpJlpd2Nj4nA.N8OfuNnyaSNBewquwLfqagu5Su5UBeZ.kS	2026-04-14 17:12:32.201593+00	station
b2528219-3035-4bc7-8d33-ba324d84fa5b	shotptygtl123@gmail.com	Tirupati RPS	9247575619	$2b$12$djT9oH9izvUL.lgcCTDt5uwAJgRabinWBzNIEvxwStxqxyWEt6Rzi	2026-04-14 17:12:32.722614+00	station
be4374a3-b560-4acc-a0fd-3f874188d1fd	reniguntarpsru@gmail.com	Renigunta RPS	9247575621	$2b$12$sY/BPY05D5xqlJeULhILVORZm0CtkmVI.Xk/9qqP1URHSN3bPf08m	2026-04-14 17:12:32.984264+00	station
b648848a-3fc0-41fd-8158-e82b52318dee	chiittoorgrp@gmail.com	Chittoor RPS	9247575622	$2b$12$xMaHNf7XmDzsOJOz.ucVMO3POvSrmWPHZtLlZHQilOnrS.EcC9Fd.	2026-04-14 17:12:33.245526+00	station
18597500-91ee-4df4-a071-84acee86fac0	sho.kadaparps@gmail.com	Kadapa RPS	9247575624	$2b$12$zbUGO04g1KgDddVntMduGutqKUmumNjfzlDqM0eXUrAFLaxPFP3p.	2026-04-14 17:12:33.506982+00	station
5e381b50-0d2c-4931-94ce-e0c4aea92433	nlrgrpgtl@gmail.com	Nellore RPS	9247575628	$2b$12$vHCHvmVdva9MMv95F23oy.CiNDVR0AV2ecyQ7.Y6bVxEBY0oZLX9W	2026-04-14 17:12:34.029119+00	station
31713068-f459-47fd-b849-ef5388d0dfc6	kavalirps@gmail.com	Kavali RPS	9247575630	$2b$12$e31X9iy7YwbQR1PK/kr6puNv5mX/0rqLV5eAuzX0/52lPdynRZpT2	2026-04-14 17:12:34.551734+00	station
f2ed6813-596c-446f-b2e8-ac04d238ef1a	ongolerps647@gmail.com	Ongole RPS	9247575632	$2b$12$0o3ci9ggXORteR/fA4Kkg.ffe2q0FFgLlZC.VvI/W.eWxNu5Y5Hfa	2026-04-14 17:12:34.812577+00	station
666267aa-e53b-4d77-95ea-67d46fec0708	chiralagrp@gmail.com	Chirala RPS	9247575633	$2b$12$rxAOzSiv4MBH/nl2yTBiq.vqBzsCImA.qRIJmTqJZClvs0ldRoh2.	2026-04-14 17:12:35.073805+00	station
c19c61d0-48ac-4a9b-8116-45aa60beb956	grpsvza@gmail.com	Vijayawada RPS	9247585712	$2b$12$Fg7YPQSKSkfxtGQzTmKyLuekgLhgZIAJVxGhQwOTPJqNo2IcrBxDy	2026-04-14 17:12:26.453621+00	station
72ba7c2b-f1d4-4832-af88-72f2d5932886	gudivadagrps244352@gmail.com	Gudivada RPS	9247585713	$2b$12$zj3lV3GVEkne/p7gVSv0euVfw5w1rBFHQNj4Xln94rSp3dc/0fu/6	2026-04-14 17:12:26.714761+00	station
3c06a32f-aa48-4c23-9878-9ba1df07e550	grps.eluru2019@gmail.com	Eluru RPS	9247585769	$2b$12$tQQHzIlSb9FyXwX7Ni.rqe2NgNB7T3q9pZBeDuvATqjEP4M5LPqru	2026-04-14 17:12:26.976276+00	station
7a6e7d4e-b28c-4e18-a963-af0064d0bb97	shogrpgnt.grpgnt@gmail.com	Guntur RPS	9247585716	$2b$12$Ggqho0PXgs7uDEjN3TcmPe.T0xGQVTuqlnooe4MPLnba5kPKQ8gFi	2026-04-14 17:12:27.238217+00	station
34f5528d-de00-4778-9890-127b66ec4738	grpnrtrps@gmail.com	Narasaraopet RPS	9247585720	$2b$12$AqHOZbeHlkYNh7Eqjb0XjeMcly/W8H.cTY4sbE.GXuTpJFdA8V772	2026-04-14 17:12:27.500128+00	station
f3a46385-1139-409c-bce5-c20f5b966331	shotenalirlygrp@gmail.com	Tenali RPS	9247585721	$2b$12$rUfPRtrWu.1S8BNZ6iRH6eXxoAAfsw.u//vD8nUJD1XhFwyQ/C2mq	2026-04-14 17:12:27.762133+00	station
4c55c3b5-4dcd-4240-ac90-f52950b838e1	shogrpnadikudi@gmail.com	Nadikudi RPS	9247585723	$2b$12$6tx3fW6ypnehHrugkEsJOuZwTuJ9m8IZk1KAR4onWb8cvjafkKmgi	2026-04-14 17:12:28.023889+00	station
2ba5fe1f-916a-44c2-a3f2-3714cd161ba6	rajahmundrygrp@gmail.com	Rajahmundry RPS	9247585726	$2b$12$SHSC5vMUUNun.seFEDbRFeW.4YFbqksKB0Az4S8RZJFa/wbWWNfdC	2026-04-14 17:12:28.284942+00	station
b37f2dcc-e10b-4464-be01-e795057b393a	samalkotrps@gmail.com	Samalkot RPS	9247585729	$2b$12$mID2m4pboxdePteAaDJrZOVDO7.Vbn8J97./6EyYoBWDJiN7KjFHK	2026-04-14 17:12:28.546787+00	station
2ed25316-cdb3-4e40-8231-886702a2adb2	grpsituni@gmail.com	Tuni RPS	9247585731	$2b$12$/9GqvJtutWQCjA1RQKfY3uTNeChqg7T8gh4IMj0wnbp.y2clcdfqC	2026-04-14 17:12:28.807907+00	station
20ce1505-f55b-4e77-b1ad-3c80519b5e73	bvrmgrps@gmail.com	Bhimavaram RPS	9247585732	$2b$12$vf7BGwtj/7b4vDahzYCu7eXUFybkXfBuRaL/ecnORQSG05Te2NMpe	2026-04-14 17:12:29.068925+00	station
f8c1f439-3ae1-4134-af41-485270792fb9	railwaypolicetadepalligudem@gmail.com	Tadepalligudem RPS	9247585733	$2b$12$xe5allpHyt4sTNP3qscPYe7b6skb/NKrB.abjbhW82qcq87mjVHzq	2026-04-14 17:12:29.329875+00	station
c936da09-f0f4-4b2a-8be7-e19ad2c952d4	shogrpvisakhapatnam@gmail.com	Visakhapatnam RPS	9247585739	$2b$12$p8NsvkY1Nt52maRnVZECGeqZ5XdvUmb.9vtXXLzdc/7NFAGZ8AcLS	2026-04-14 17:12:29.590316+00	station
7135b308-24b0-4a33-ae4c-51cbc7ba72e9	palasagrps@gmail.com	Palasa RPS	9247585743	$2b$12$rmwE67KZnmA5OeA34PVGM.wOub3FEuNIEfa66nyvV0CaAcuJpfvza	2026-04-14 17:12:30.11262+00	station
\.


--
-- Data for Name: unidentified_bodies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unidentified_bodies (id, image_url, image_file_name, station, district, reported_date, description, uploaded_by, created_at) FROM stdin;
b73e0b89-7da8-44b0-8ddd-234a48f9949c	/unidentified_uploads/5113625d15514e92bc69e162d2226ff7.png	5113625d15514e92bc69e162d2226ff7.png	Vizianagaram RPS	\N	2026-01-13	Gender: male person\r\nAge:30-35 yrs\r\nHeight:5.5\r\nComplexion:Fair\r\nFace type:oval	Vizianagaram RPS	2026-04-22 06:37:03.513511+00
eec14e3c-dd40-42aa-abc6-b396e4403650	/unidentified_uploads/e0bfcf53b6b2485d87846a3da2469819.png	e0bfcf53b6b2485d87846a3da2469819.png	Tuni RPS	\N	2024-04-27	Un  Identified  male  45  yrs\r\nFace was injured and white checks shirt.	Tuni RPS	2026-04-22 06:37:52.092332+00
f0e01ced-41de-4d92-abb0-73bf3968b608	/unidentified_uploads/393fe982a4e34952b3a100d467e15b24.png	393fe982a4e34952b3a100d467e15b24.png	Eluru RPS	\N	2025-01-13	clad with (1) Light biscuit color full hands shirt, 2) Blue  color  cut bunion, 3) Brown color Inner, 4) Green color Lungi.\r\nHeight:5.6’	Eluru RPS	2026-04-22 06:22:26.737117+00
dc6c939a-b112-4f7e-b5b3-744de5661f08	/unidentified_uploads/ad168139cf3e474aa687eb57af0334f0.png	ad168139cf3e474aa687eb57af0334f0.png	Eluru RPS	\N	2025-01-12	clad with (1) Cement color half hands T.Shirt, 2) Cement and Green color strips T.Shirt, 3) Brown color short, 4) Red color Umbilical cord 2 pairs and Brown color belt.\r\nHeight:5.0’	Eluru RPS	2026-04-22 06:24:07.59959+00
c937075b-1347-45ea-b9b8-3f4a83374852	/unidentified_uploads/0f892de817e541029d47b06eb3b08281.png	0f892de817e541029d47b06eb3b08281.png	Eluru RPS	\N	2025-12-30	clad with (1) Blue Color checks Shirt, (2) Blue Jeans pant (03) Phone NO.6300516012 written slip in the pocket\r\nHeight:5.5’	Eluru RPS	2026-04-22 06:25:15.005766+00
fc2551b4-9617-4791-9441-7b69cea9272a	/unidentified_uploads/eb36a0f431be414694d1c864f21ee512.png	eb36a0f431be414694d1c864f21ee512.png	Gudivada RPS	\N	2026-01-22	An unknown male dead body aged about 45 years,  MOLES: 1) A mole on the right side of the abdomen,  CLOTHES: 1) Navy blue color short 2) Saffron color towel, 3) Wight and black color waist thread	Gudivada RPS	2026-04-22 06:27:21.157513+00
158c0100-9165-4eb7-ba7e-87433f2b81f3	/unidentified_uploads/726f95ec4c7346a28564982b38efe082.png	726f95ec4c7346a28564982b38efe082.png	Gudivada RPS	\N	2026-03-19	An unknown male dead body aged about 30 years,\r\nCLOTHES: 1. A white stripe on black track pant, 2) A full-sleeved shirt with blue checks on a yellow background., 3) Navy blue cut-style underwear with the GENX label, 4) Light green cut-sleeve bunion,MOLES: 1. A MOLE ON THE MIDILE OF FORE HEAD, 2.A MOLE ON THE LEFT SIDE CHIN.	Gudivada RPS	2026-04-22 06:28:35.958012+00
c501eb5e-302d-48b6-9d4d-d26bf72b3464	/unidentified_uploads/7c7fdfb30e5d4d13acc0328d303f1f7c.png	7c7fdfb30e5d4d13acc0328d303f1f7c.png	Gudivada RPS	\N	2025-10-20	An unknown male person, aged about 30 years,\r\nCloths :wearing a black half-hand T-shirt, black pant, and gray full underwear,\r\nMOLES: 1. A MOLE ON THE RIGHT SIDE OF THE CHEST, 2.A MOLE ON THE LEFT SIDE OF THE STOMACH, 3.A TATTOO ON LEFT SIDE OF THE CHEST NAMELY RADHIKA IN TELUGU, 4. A TATTOO ON LEFT HAND NAMELY SRAVANI IN TELUGU AND RSR LETTERS IN ENGLISH, 5. A TATTOO ON RIGHT HAND NAMELY AMMA NANNA IN TELUGU	Gudivada RPS	2026-04-22 06:29:53.228569+00
dbfee529-e27e-4299-b0d0-c6f665981ebc	/unidentified_uploads/375abd3acbb44cdbb6c6f6d97a8891cd.png	375abd3acbb44cdbb6c6f6d97a8891cd.png	Tadepalligudem RPS	\N	2024-04-21	UN-IDENTIFIED\r\nFEMALE INFANT OF 10-15 DAYS	Tadepalligudem RPS	2026-04-22 06:30:49.277621+00
5621392b-92b5-4bbb-bc2c-46587b49e4ab	/unidentified_uploads/beb7825028cb44999acc204a4e3e283e.png	beb7825028cb44999acc204a4e3e283e.png	Tadepalligudem RPS	\N	2024-07-24	UN-IDENTIFIED\r\nMALE PERSON OF AGED ABOUT 40 YRS	Tadepalligudem RPS	2026-04-22 06:32:01.178788+00
c261a11c-386b-4239-a975-10cecfa11025	/unidentified_uploads/86cfcea971554c88b071e16cb439d54f.png	86cfcea971554c88b071e16cb439d54f.png	Tadepalligudem RPS	\N	2024-07-24	UN-IDENTIFIED\r\nMALE PERSON OF AGED ABOUT 60 YRS	Tadepalligudem RPS	2026-04-22 06:32:57.265269+00
912bcd9a-c0b2-443a-bb69-5975a3b555b7	/unidentified_uploads/b45b7ca05afa47aea6c7e3238effbdcd.png	b45b7ca05afa47aea6c7e3238effbdcd.png	Vizianagaram RPS	\N	2025-08-25	Gender: male person\r\nAge:35 yrs\r\nHeight:5.6\r\nComplexion:Fair\r\nFace type:Round	Vizianagaram RPS	2026-04-22 06:34:30.099644+00
5edd8216-e8ca-4fc5-807e-a8ddacc06412	/unidentified_uploads/d260fafe7af6405ea1c7a8257adcc2d9.png	d260fafe7af6405ea1c7a8257adcc2d9.png	Tuni RPS	\N	2024-04-02	un Identified  male person aged about 35 years.\r\nBlack hair and Black Beard	Tuni RPS	2026-04-22 06:35:02.293641+00
afd4c649-090c-47f6-afb6-4e59e72ace19	/unidentified_uploads/27efede8b1a643c79e2f5536ad1c4e96.png	27efede8b1a643c79e2f5536ad1c4e96.png	Vizianagaram RPS	\N	2025-09-29	Gender: male person\r\nAge:35 yrs\r\nHeight:5.5\r\nComplexion:Fair\r\nFace type:Round	Vizianagaram RPS	2026-04-22 06:35:26.072861+00
98f7a72c-60c0-4841-9999-49cfbfbd2bb5	/unidentified_uploads/410e01388aaf4cdd95dda9a14e304b6c.png	410e01388aaf4cdd95dda9a14e304b6c.png	Tuni RPS	\N	2024-05-31	Unknown female aged about 30-32 yrs,\r\n5.2 height and round face.	Tuni RPS	2026-04-22 06:36:41.71125+00
91f157a9-e130-4378-bec5-9ca5624e8e1d	/unidentified_uploads/ea8698250abf428f8df6402b1375acbd.png	ea8698250abf428f8df6402b1375acbd.png	Palasa RPS	\N	2025-01-12	Unknown male person, aged about 30-35 Years; Height 5’ 3” inches\r\nRound Face \r\nMedum Complexion	Palasa RPS	2026-04-22 06:40:31.514052+00
529125c2-d4fe-4d7d-96b3-037124e2048b	/unidentified_uploads/ab19c460ccec4d5abb98b8e3c21ff2b7.png	ab19c460ccec4d5abb98b8e3c21ff2b7.png	Palasa RPS	\N	2025-12-22	Unknown male person, aged about 35-40 Years; Height 5’ 3” inches\r\nRound Face \r\nMedum Complexion	Palasa RPS	2026-04-22 06:41:31.315109+00
66ab3558-322d-4bf8-ba09-a65487c94d11	/unidentified_uploads/2ef75af83e884fc5b6842561ab54f1bf.png	2ef75af83e884fc5b6842561ab54f1bf.png	Bhimavaram RPS	\N	2024-07-11	Unidentified male person aged between 50-60 yrs	Bhimavaram RPS	2026-04-22 06:42:06.905353+00
981d8acf-6b5a-4595-9e78-d134799d0a97	/unidentified_uploads/fd6c512b59054418863125e1eb6abd52.png	fd6c512b59054418863125e1eb6abd52.png	Palasa RPS	\N	2026-01-20	Unknown male person, aged about 55-60 Years; Height 5’ 3” inches\r\nRound Face \r\nMedum Complexion	Palasa RPS	2026-04-22 06:42:19.859164+00
ccf80cbf-d387-44f2-9378-783d2f0ec92b	/unidentified_uploads/0bc0afdd95cc43a783bb51af7528f9f6.png	0bc0afdd95cc43a783bb51af7528f9f6.png	Bhimavaram RPS	\N	2024-04-27	Unidentified male person aged between 20-25 yrs	Bhimavaram RPS	2026-04-22 06:43:18.243031+00
543124ea-ef8c-4ded-85d8-1664b203c93c	/unidentified_uploads/42b57f29b72f4c4b8388ce37314dd388.png	42b57f29b72f4c4b8388ce37314dd388.png	Bhimavaram RPS	\N	2024-04-17	Unidentified male person aged about 30-35 yrs	Bhimavaram RPS	2026-04-22 06:44:40.322748+00
20c7c393-1c79-46d4-9113-a4c42fc16dc3	/unidentified_uploads/d165049136e143fb9484556678444a10.png	d165049136e143fb9484556678444a10.png	Samalkot RPS	\N	2022-01-12	Cloths: brown color with small boxes shirt\r\n2.Coffee color pant \r\nHeight:5’6”	Samalkot RPS	2026-04-22 06:45:58.506295+00
bd9a83fa-6460-4a69-aedf-2ca5e76dbdb2	/unidentified_uploads/f701034b26e248f2bdbb7ac17bcc4fd8.png	f701034b26e248f2bdbb7ac17bcc4fd8.png	Samalkot RPS	\N	2023-05-17	Cloths: Black color shirt\r\n2. brown color pant \r\nHeight:5’7”	Samalkot RPS	2026-04-22 06:46:43.492113+00
841979e5-5efb-4f2e-9178-1c6d8fdd334e	/unidentified_uploads/d0ea79bf6583430b9837c76e4c8edc22.png	d0ea79bf6583430b9837c76e4c8edc22.png	Samalkot RPS	\N	2023-03-28	Cloths: white color shirt\r\n2. white color lungie\r\n3. white color Banion\r\nHeight:5’7”	Samalkot RPS	2026-04-22 06:47:36.211469+00
20d6dc9f-a1f7-4fa4-8871-d0d982ef421f	/unidentified_uploads/e49a16fb43f748cf919348dbffb81ba8.png	e49a16fb43f748cf919348dbffb81ba8.png	Rajahmundry RPS	\N	2024-02-17	Un-identified male person aged about 40 yrs\r\nNatural	Rajahmundry RPS	2026-04-22 11:00:44.8725+00
fd89c9bc-060a-4380-8596-318c647d2d90	/unidentified_uploads/11b130658e674eff9e901bef3aee1d2c.png	11b130658e674eff9e901bef3aee1d2c.png	Rajahmundry RPS	\N	2024-05-18	un-identified male person aged about 40 yrs \r\nInjuried by train	Rajahmundry RPS	2026-04-22 11:01:35.491219+00
142f3f56-f6bd-4614-8469-206ed368ba76	/unidentified_uploads/592fdf4f4e724aefba9afd28b573acef.png	592fdf4f4e724aefba9afd28b573acef.png	Rajahmundry RPS	\N	2024-03-31	unknown male person aged about 35 yrs\r\nInjuried through fallen down	Rajahmundry RPS	2026-04-22 11:02:21.886462+00
d99d9924-6937-49ab-8c68-6dce6b5171f9	/unidentified_uploads/ab06567b8bd74f17b3f389bf5a5cc019.png	ab06567b8bd74f17b3f389bf5a5cc019.png	Vijayawada RPS	\N	2026-01-31	This is a case of Un-Natural death of a male person aged about 30 yrs	Vijayawada RPS	2026-04-22 11:02:33.516897+00
cc2e1910-8659-456e-95b0-dcfe677c1bb7	/unidentified_uploads/75e24b28300c4164a1a06f0094a64256.png	75e24b28300c4164a1a06f0094a64256.png	Vijayawada RPS	\N	2026-01-20	This is a case of Natural death of an unknown male dead body	Vijayawada RPS	2026-04-22 11:03:25.728799+00
1b9373d4-77c1-46b5-80c6-5ae44159e3bd	/unidentified_uploads/5b29010c9c474d1cb21a8ae40eb45e00.png	5b29010c9c474d1cb21a8ae40eb45e00.png	Guntur RPS	\N	2025-01-18	1\tGuntur RPS\tCr.No. 5/2025 u/s 194 BNSS\t18-01-2025, prior to 22:30 hrs \tat KM No. 20/11-9, between MIX Cabin and Vejendla Railway stations\taged about 35 years and a small baby girl, aged about 2 year, died and laid beside the tracks at above mentioned place with blood injuries. The female was wearing a light sea-green top, violet-colour pant and a white T-shirt.	Guntur RPS	2026-04-22 11:06:50.494327+00
faa7f54e-2be8-4857-a222-93c331a3b0e6	/unidentified_uploads/dfedb49799a14e55812e53d4d316c8ab.png	dfedb49799a14e55812e53d4d316c8ab.png	Guntur RPS	\N	2025-03-24	unidentified female person aged about 65 yrs	Guntur RPS	2026-04-22 11:07:34.818768+00
502c6259-0dc5-40fd-9b51-d590196c24ce	/unidentified_uploads/bc87c0dc563542a1a7c526ac461eedeb.png	bc87c0dc563542a1a7c526ac461eedeb.png	Vijayawada RPS	\N	2026-01-09	This is a case of Accidental Tress-pass death of an Unknown male dead\r\nbody,aged about 40 yrs,Identification Marks of Deceased person (1) A mole on the left side of the waist (2) A Mole on the\r\nRight side of the cheek .Deceased person Weared Cloths (1)white colour and snuff colour combination of Design Fullhand Shirt, (2) Khaki	Vijayawada RPS	2026-04-22 11:07:39.844723+00
d0bce439-f2cd-4b59-ac45-22eaf6f840f5	/unidentified_uploads/72e450f21ff447f5a1f802c5bbf4e30c.png	72e450f21ff447f5a1f802c5bbf4e30c.png	Guntur RPS	\N	2025-07-09	unknown male person aged about 40 years	Guntur RPS	2026-04-22 11:08:54.922071+00
37aa0d1d-e848-4f80-b206-2f615184d3f5	/unidentified_uploads/ae692189033f4700abc84dbd4d26e089.png	ae692189033f4700abc84dbd4d26e089.png	Tenali RPS	\N	2025-10-08	Features of the Dead Body: Height: 5’.6”, Complexion: Normal, Hair: White and black and has beard and one length, Moles: 1) ABM on the left side of the ribs, 2) ABM on the left side of the Ear, Wearing Cloths: 1) White and black  while colour full hand shirt and Black colour pant,	Tenali RPS	2026-04-22 11:11:22.950771+00
b36055de-3675-4e58-a662-5f175ef2ed1a	/unidentified_uploads/8d1a9b9acfb74fab9bd99ee8bc50aa28.png	8d1a9b9acfb74fab9bd99ee8bc50aa28.png	Visakhapatnam RPS	\N	2026-03-01	Male / age about 60, Hight 5.6 feet, Medium complexion	Visakhapatnam RPS	2026-04-22 11:11:54.404557+00
dd6561c5-2437-4250-bdf0-5208664425b4	/unidentified_uploads/ad007bf260184e74a20de93539f211a3.png	ad007bf260184e74a20de93539f211a3.png	Tenali RPS	\N	2025-11-30	Features of the Dead Body: Height: 5’.0”, Complexion: Normal complexion, Hair: White, Moles: The whole body are crushed not any moles identified on the body,  Wearing Cloths: 1) Coffee colour with baniyan,2)White and  brown checks shirt half hands.3) Blue color Jeans Pant, Things: Nil, Assets: Nil	Tenali RPS	2026-04-22 11:12:26.996417+00
dea8baf2-13e5-4a18-ba93-1fe1872d7294	/unidentified_uploads/70b1b6e2ac0740398daa0eeeb264098b.png	70b1b6e2ac0740398daa0eeeb264098b.png	Visakhapatnam RPS	\N	2026-03-04	Male/ age about 50 yrs., Hight 5.5 feet, Medium complexion, Face oval,	Visakhapatnam RPS	2026-04-22 11:12:50.477157+00
e0a3581b-e61f-4020-9b71-593520a65ca7	/unidentified_uploads/aed98dcf8854482b8204112c11b79bb0.png	aed98dcf8854482b8204112c11b79bb0.png	Tenali RPS	\N	2025-12-11	identification marks: The height of the corpse of the deceased is about 5 feet, medium in complexion, a mole on  right side chest and another mole on left side bones.   Clothes:  1.Blue colour shirt with black colour stripes.  2.Blue colour pant.	Tenali RPS	2026-04-22 11:13:28.412021+00
83ad046e-9fe6-4976-99e7-ab1785739929	/unidentified_uploads/2e78fb8c99764a1f9fd2ff24eff06962.png	2e78fb8c99764a1f9fd2ff24eff06962.png	Visakhapatnam RPS	\N	2026-03-10	Male/ age about 65 yrs.,  Hight -5.2, Medium complexion	Visakhapatnam RPS	2026-04-22 11:13:48.406886+00
4355e9ea-734f-4db6-a6db-84c1135d476b	/unidentified_uploads/ec403e65be914854b9c10b61cd82d076.png	ec403e65be914854b9c10b61cd82d076.png	Narasaraopet RPS	\N	2024-04-24	5.\t\tNarasaraopet RPS\tCr.no.15/2024 U/s. 174 Cr.P.C\tOccurred on 24.04.2024 prior to 08.30 hrs\tin the General waiting hall, beside the booking window of Narasaraopet Rs\tUn-known female person aged about 80 years descriptive particulars:- oval face, lean body, white hair, medium complexion, height -5’0”, moles: 1) a mole on the right side ribs 2) a mole on the left hand shoulder (.) Cloths: 1) pink colour nighty\t \tNatural death	Narasaraopet RPS	2026-04-22 11:15:33.568483+00
0f1a1397-2a9f-4829-b72c-82d1d7169ae0	/unidentified_uploads/2e034c369a654a1dadc442100af2df88.png	2e034c369a654a1dadc442100af2df88.png	Narasaraopet RPS	\N	2024-09-19	Un-known male person aged about 55 years descriptive particulars:- oval face, medium body, black&white hair, medium complexion, height -5’0”, moles: 1) not visable (.) Cloths: 1) coffe  colour vertical lined full hands shirt 2) yellow & blue colour half hands t-shirt 3) black colour lower	Narasaraopet RPS	2026-04-22 11:16:37.8328+00
edc56dba-8eeb-4759-ab3c-649874eaded5	/unidentified_uploads/4a4f7534a2ef4bd49c97be460e3959fa.png	4a4f7534a2ef4bd49c97be460e3959fa.png	Narasaraopet RPS	\N	2024-08-23	Un-known male person aged about 35 years descriptive particulars:- oval face, lean body, black hair, medium complexion, height -5’5”, moles: 1) a tatoo mark shivuni bomma and chaitanya in telugu words on right hand (.) Cloths: 1) blue color full hands shirt 2) blue color cotton pant	Narasaraopet RPS	2026-04-22 11:17:40.793281+00
0d2c3e1c-fe20-41cf-8af6-336e2d02a65c	/unidentified_uploads/0974c55cf1624bc992f6f897985d72bc.png	0974c55cf1624bc992f6f897985d72bc.png	Nadikudi RPS	\N	2023-05-31	2\tNadikudi RPS\t17/2023 U/s 174 Cr.PC\t31.05.2023\tAt K.M.No.16/3-2 in between bandarupalli and Siripuram Railway stations\tMoles are not found on the dead body of the deceased. Wearing white colour shirts with strips and black colour night pant and pink colour short.\t \tCase is UI to establish the identity of the deceased.\r\nProposal is being sent to DSRP, Guntur for refer the case as Action Drop	Nadikudi RPS	2026-04-22 11:19:17.366651+00
5c90dda8-d61c-4a42-bc5f-1c9d0e3a9ec2	/unidentified_uploads/fe59b13fa2784d968f3c37ae3c97d441.png	fe59b13fa2784d968f3c37ae3c97d441.png	Nadikudi RPS	\N	2023-10-30	1.\tABM on the chest and 2. Tattoo is situated on the right side of the chest\r\n\r\nWearing a Blue colour lungi having strips and white colour full hands shirt, having with straight and cross strips.	Nadikudi RPS	2026-04-22 11:20:16.583101+00
3b5b6967-5ef4-48a4-9004-7fa5e76b34d9	/unidentified_uploads/2afe86189dd84ffdb5fbc84dc6410ff0.png	2afe86189dd84ffdb5fbc84dc6410ff0.png	Nadikudi RPS	\N	2024-03-20	15\tNadikudi RPS\t20/2024 U/s 174 Cr.PC\t20-03-2024\tat KM No. 41/1-2, between Sattenapalli and Pedakurapadu Railway Stations\t1.\tABM is below right leg knee and having a tattoo on the left hand as Rama Chandramma.\r\nClothes: white colour jacket and maroon colour saree, having with gold and green colour boarder.\t \tCase is UI to establish the identity of the deceased.\r\nProposal is being sent to DSRP, Guntur for refer the case as Action Drop	Nadikudi RPS	2026-04-22 11:21:14.387056+00
\.


--
-- Name: admin admin_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_email_key UNIQUE (email);


--
-- Name: admin admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_tracking_number_key UNIQUE (tracking_number);


--
-- Name: crime_data crime_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crime_data
    ADD CONSTRAINT crime_data_pkey PRIMARY KEY (id);


--
-- Name: dgp dgp_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dgp
    ADD CONSTRAINT dgp_email_key UNIQUE (email);


--
-- Name: dgp dgp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dgp
    ADD CONSTRAINT dgp_pkey PRIMARY KEY (id);


--
-- Name: dsrp dsrp_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dsrp
    ADD CONSTRAINT dsrp_email_key UNIQUE (email);


--
-- Name: dsrp dsrp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dsrp
    ADD CONSTRAINT dsrp_pkey PRIMARY KEY (id);


--
-- Name: help_requests help_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.help_requests
    ADD CONSTRAINT help_requests_pkey PRIMARY KEY (id);


--
-- Name: irp irp_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.irp
    ADD CONSTRAINT irp_email_key UNIQUE (email);


--
-- Name: irp irp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.irp
    ADD CONSTRAINT irp_pkey PRIMARY KEY (id);


--
-- Name: public_users public_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_users
    ADD CONSTRAINT public_users_email_key UNIQUE (email);


--
-- Name: public_users public_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_users
    ADD CONSTRAINT public_users_pkey PRIMARY KEY (id);


--
-- Name: srp srp_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.srp
    ADD CONSTRAINT srp_email_key UNIQUE (email);


--
-- Name: srp srp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.srp
    ADD CONSTRAINT srp_pkey PRIMARY KEY (id);


--
-- Name: stations stations_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_email_key UNIQUE (email);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: unidentified_bodies unidentified_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unidentified_bodies
    ADD CONSTRAINT unidentified_bodies_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict mpFSkrde8iQ4VndvIxRyTweAOsxSGyml89ciIY3KmkA8OxlNyXjES5F4kUEEits

