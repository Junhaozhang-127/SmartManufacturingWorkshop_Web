<script setup lang="ts">
import type { DeviceDetail } from '@smw/shared';

defineProps<{
  visible: boolean;
  loading: boolean;
  detail: DeviceDetail | null;
}>();

const emit = defineEmits<{
  close: [];
  report: [deviceId: string];
  openRepair: [repairId: string];
}>();
</script>

<template>
  <el-drawer :model-value="visible" size="720px" @close="emit('close')">
    <template #header>
      <div>
        <strong>{{ detail?.deviceName || '设备详情' }}</strong>
        <div v-if="detail" class="drawer-subtitle">{{ detail.deviceCode }} / {{ detail.categoryName }}</div>
      </div>
    </template>

    <div v-loading="loading" class="device-detail-grid">
      <template v-if="detail">
        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">Device Snapshot</p>
              <h2>基础信息</h2>
            </div>
            <el-button type="primary" @click="emit('report', detail.id)">发起报修</el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="设备状态">{{ detail.statusCode }}</el-descriptions-item>
            <el-descriptions-item label="责任人">{{ detail.responsibleUserName || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="型号">{{ detail.model || '-' }}</el-descriptions-item>
            <el-descriptions-item label="位置">{{ detail.locationLabel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生产厂商">{{ detail.manufacturer || '-' }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ detail.serialNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="购置日期">{{ detail.purchaseDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="质保到期">{{ detail.warrantyUntil || '-' }}</el-descriptions-item>
            <el-descriptions-item label="扩展位">
              保留维修历史 / 状态恢复 / 报废申请
            </el-descriptions-item>
            <el-descriptions-item label="备注">{{ detail.remarks || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">Repair History</p>
              <h2>维修历史</h2>
            </div>
          </div>
          <el-table :data="detail.repairHistory" size="small">
            <el-table-column prop="reportedAt" label="报修时间" min-width="160" />
            <el-table-column prop="statusCode" label="状态" min-width="120" />
            <el-table-column prop="severity" label="紧急程度" min-width="100" />
            <el-table-column prop="handlerName" label="处理人" min-width="120" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" @click="emit('openRepair', row.id)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">Status Trace</p>
              <h2>状态留痕</h2>
            </div>
          </div>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in detail.statusLogs"
              :key="`${item.actionType}-${index}`"
              :timestamp="item.createdAt"
            >
              {{ item.actionType }}: {{ item.fromStatus || 'INIT' }} -> {{ item.toStatus || '-' }}
              <span v-if="item.comment">（{{ item.comment }}）</span>
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </div>
  </el-drawer>
</template>
