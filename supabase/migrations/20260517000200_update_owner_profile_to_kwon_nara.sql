update public.team_memberships
set
  profile_name = '권나라',
  photo_url = 'https://talkimg.imbc.com/TVianUpload/tvian/TViews/image/2022/06/02/636802e8-f6a1-40e7-aa29-ac8c51ad55b3.jpg',
  updated_at = now()
where
  id = '00000000-0000-0000-0000-000000000211'
  and club_id = '00000000-0000-0000-0000-000000000001'
  and role = 'admin';
