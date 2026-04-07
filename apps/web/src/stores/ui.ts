import { defineStore } from 'pinia';

interface DrawerState {
  visible: boolean;
  title: string;
  payload: unknown;
}

export const useUiStore = defineStore('ui', {
  state: (): DrawerState => ({
    visible: false,
    title: '',
    payload: null,
  }),
  actions: {
    openDrawer(title: string, payload: unknown) {
      this.visible = true;
      this.title = title;
      this.payload = payload;
    },
    closeDrawer() {
      this.visible = false;
      this.title = '';
      this.payload = null;
    },
  },
});
