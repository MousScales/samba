import React from 'react';
import CreateEventScreen from './CreateEventScreen';

/** Dedicated edit screen — same form as create, with edit-only header actions. */
export default function EditEventScreen(props) {
  return <CreateEventScreen {...props} forcedMode="edit" />;
}
