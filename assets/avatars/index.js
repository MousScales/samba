const AVATARS = {
  'Marcus Chen': require('./avatar-marcus-chen.png'),
  'Sofia Martinez': require('./avatar-sofia-martinez.png'),
  'Alex Rivera': require('./avatar-alex-rivera.png'),
  'Jamie Okonkwo': require('./avatar-jamie-okonkwo.png'),
  'Priya Sharma': require('./avatar-priya-sharma.png'),
  'Casey Nguyen': require('./avatar-casey-nguyen.png'),
  'Taylor Brooks': require('./avatar-taylor-brooks.png'),
  'Jordan Lee': require('./avatar-jordan-lee.png'),
  'Riley Adams': require('./avatar-riley-adams.png'),
  'Dana Ortiz': require('./avatar-dana-ortiz.png'),
  'Sam Ortiz': require('./avatar-sam-ortiz.png'),
  'Chris Park': require('./avatar-chris-park.png'),
  'Morgan Blake': require('./avatar-taylor-brooks.png'),
  'Elena Vasquez': require('./avatar-dana-ortiz.png'),
  'Noah Kim': require('./avatar-chris-park.png'),
};

export const getPersonAvatar = (name, remoteUrl) => {
  if (remoteUrl) return { uri: remoteUrl };
  if (name && AVATARS[name]) return AVATARS[name];
  const label = encodeURIComponent((name || 'Guest').trim() || 'Guest');
  return { uri: `https://ui-avatars.com/api/?name=${label}&background=FF4B8C&color=fff&size=200` };
};

export const resolveAvatarSource = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === 'number') return avatar;
  if (typeof avatar === 'object' && avatar.uri) return avatar;
  if (typeof avatar === 'string') return { uri: avatar };
  return null;
};

export default AVATARS;
