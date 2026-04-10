<script setup lang="ts">
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { uploadCreationBodyImage } from '@web/api/creation';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';

type ModelValue = string;

const props = defineProps<{
  modelValue: ModelValue;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ModelValue];
  'text-length-change': [value: number];
}>();

const editorRef = shallowRef<IDomEditor | null>(null);

const valueHtml = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value),
});

const styleVars = computed(() => ({
  '--rte-min-height': `${props.minHeight ?? 320}px`,
}));

const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    '|',
    'bold',
    'italic',
    'through',
    '|',
    'color',
    'bgColor',
    '|',
    'blockquote',
    'divider',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'insertLink',
    'uploadImage',
    'codeBlock',
    '|',
    'undo',
    'redo',
  ],
};

async function uploadImage(file: File) {
  const response = await uploadCreationBodyImage(file);
  return response.data;
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder ?? '请输入正文',
  readOnly: props.disabled === true,
  MENU_CONF: {
    uploadImage: {
      // eslint-disable-next-line no-unused-vars
      async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
        try {
          const uploaded = await uploadImage(file);
          const previewUrl = `/api/portal/files/preview?key=${encodeURIComponent(uploaded.storageKey)}`;
          insertFn(previewUrl, uploaded.fileName || 'image', previewUrl);
        } catch (error) {
          ElMessage.error(error instanceof Error ? error.message : '图片上传失败');
        }
      },
    },
  },
};

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor;
  if (props.disabled) editor.disable();
}

function handleChange(editor: IDomEditor) {
  emit('text-length-change', editor.getText().length);
}

watch(
  () => props.disabled,
  (disabled) => {
    const editor = editorRef.value;
    if (!editor) return;
    if (disabled) editor.disable();
    else editor.enable();
  },
);

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor) editor.destroy();
});
</script>

<template>
  <div class="rte" :class="{ 'rte--disabled': disabled }" :style="styleVars">
    <Toolbar :editor="editorRef" :default-config="toolbarConfig" class="rte__toolbar" />
    <Editor
      v-model="valueHtml"
      :default-config="editorConfig"
      class="rte__editor"
      mode="default"
      @on-created="handleCreated"
      @on-change="handleChange"
    />
  </div>
</template>

<style scoped>
.rte {
  border: 1px solid #d7dee8;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.rte__toolbar {
  border-bottom: 1px solid #d7dee8;
}

.rte__editor :deep(.w-e-text-container) {
  min-height: var(--rte-min-height);
}

.rte--disabled {
  opacity: 0.9;
}
</style>
