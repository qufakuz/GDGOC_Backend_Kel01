<script setup>
import { ref, onBeforeUnmount, onMounted, watch, computed } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import axios from 'axios'
import Swal from 'sweetalert2'
import { VCardTitle } from 'vuetify/components/VCard'

const data = ref({
  judul: '',
  tabel: [],
  keterangan: '',
})

const isInitialLoad = ref(true)
const showModal = ref(false)
const showDeleteConfirmation = ref(false)
const modalType = ref('add')
const currentRow = ref({ id: 0, nama: '', dansos: '', kas: '' })
const editingIndex = ref(-1)
const rowToDelete = ref({ id: null, index: -1 })
const fileInput = ref(null)
const searchQuery = ref('')

const filteredRows = computed(() => {
  if (!searchQuery.value) return data.value.tabel
  const query = searchQuery.value.toLowerCase().trim()
  return data.value.tabel.filter(row => row.nama.toLowerCase().includes(query))
})

// Fungsi untuk memformat angka ke format mata uang Indonesia
const formatCurrency = value => {
  if (value === null || value === undefined) return '0'
  const number = Number(value)
  return isNaN(number) ? '0' : number.toLocaleString('id-ID')
}

// Fungsi untuk mengubah format mata uang kembali ke angka
const parseCurrency = formattedValue => {
  const numberString = formattedValue.replace(/\D/g, '')
  return numberString ? parseInt(numberString, 10) : 0
}

// Fungsi untuk menampilkan error Zod
const showZodErrors = issues => {
  let errorMessages = []
  issues.forEach(issue => {
    errorMessages.push(`<li>${issue.path.join('.')}: ${issue.message}</li>`)
  })
  return `<ul class="text-left">${errorMessages.join('')}</ul>`
}

// Fungsi untuk handle error
const handleError = (error, defaultMessage = 'Terjadi kesalahan') => {
  if (error.response && error.response.status === 400 && error.response.data.issues) {
    Swal.fire({
      icon: 'error',
      title: 'Validasi Gagal',
      html: showZodErrors(error.response.data.issues),
      confirmButtonColor: '#3085d6',
    })
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: error.response?.data?.message || defaultMessage,
      confirmButtonColor: '#3085d6',
    })
  }
}

const generatePDF = async () => {
  try {
    const response = await axios.get('https://api-laporan-dana.vercel.app/pdf', {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'laporan.pdf')
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    link.remove()

    Swal.fire({
      toast: true,
      icon: 'success',
      title: 'PDF Berhasil Diunduh',
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
    })
  } catch (error) {
    handleError(error, 'Gagal mengunduh PDF')
  }
}

const debounce = (func, wait) => {
  let timeout
  return function (...args) {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(context, args), wait)
  }
}

const saveData = debounce(() => {
  axios
    .put('https://api-laporan-dana.vercel.app/', {
      judul: data.value.judul,
      keterangan: data.value.keterangan,
    })
    .then(() => {})
    .catch(error => handleError(error, 'Gagal menyimpan perubahan'))
}, 500)

watch(
  () => [data.value.judul, data.value.keterangan],
  () => {
    if (!isInitialLoad.value) saveData()
  },
)

onMounted(async () => {
  try {
    const response = await axios.get('https://api-laporan-dana.vercel.app')
    data.value = response.data.data
    editor.commands.setContent(data.value.keterangan)
    isInitialLoad.value = false
  } catch (error) {
    handleError(error, 'Gagal memuat data')
    isInitialLoad.value = false
  }
})

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      HTMLAttributes: { class: 'editor-content' },
    }),
  ],
  onUpdate({ editor }) {
    data.value.keterangan = editor.getHTML()
  },
})

onBeforeUnmount(() => editor.destroy())

const handleFileImport = async event => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async e => {
    try {
      const jsonData = JSON.parse(e.target.result)
      const response = await axios.post('https://api-laporan-dana.vercel.app/import', jsonData)

      if (response.data.status) {
        data.value = jsonData
        editor.commands.setContent(jsonData.keterangan)
        Swal.fire({
          toast: true,
          icon: 'success',
          title: 'Import Berhasil!',
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
        })
      }
    } catch (error) {
      handleError(error, 'Gagal mengimpor file')
    }
  }
  reader.readAsText(file)
}

const confirmDelete = () => {
  showDeleteConfirmation.value = true
}

const handleDelete = async () => {
  try {
    await axios.delete(`https://api-laporan-dana.vercel.app/tabel/${rowToDelete.value.id}`)
    data.value.tabel.splice(rowToDelete.value.index, 1)
    showDeleteConfirmation.value = false
    showModal.value = false
    Swal.fire({
      toast: true,
      icon: 'success',
      position: 'top-end',
      title: 'Terhapus!',
      text: 'Data telah dihapus',
      showConfirmButton: false,
      timer: 1500,
    })
  } catch (error) {
    showDeleteConfirmation.value = false
    showModal.value = false
    handleError(error, 'Gagal menghapus data')
  }
}

const openAddModal = () => {
  currentRow.value = { id: 0, nama: '', dansos: '', kas: '' }
  modalType.value = 'add'
  showModal.value = true
}

const openEditModal = (row, index) => {
  currentRow.value = { ...row }
  editingIndex.value = index
  rowToDelete.value = { id: row.id, index }
  modalType.value = 'edit'
  showModal.value = true
}

const saveRow = async () => {
  try {
    if (modalType.value === 'add') {
      const response = await axios.post('https://api-laporan-dana.vercel.app/tabel/', {
        nama: currentRow.value.nama,
        dansos: parseInt(currentRow.value.dansos),
        kas: parseInt(currentRow.value.kas),
      })
      data.value.tabel.push({ ...currentRow.value })
      Swal.fire({
        toast: true,
        icon: 'success',
        position: 'top-end',
        title: 'Data tersimpan!',
        showConfirmButton: false,
        timer: 1500,
      })
    } else {
      await axios.put(`https://api-laporan-dana.vercel.app/tabel/${currentRow.value.id}`, {
        nama: currentRow.value.nama,
        dansos: parseInt(currentRow.value.dansos),
        kas: parseInt(currentRow.value.kas),
      })
      data.value.tabel[editingIndex.value] = { ...currentRow.value }
      Swal.fire({
        toast: true,
        icon: 'success',
        position: 'top-end',
        title: 'Perubahan disimpan!',
        showConfirmButton: false,
        timer: 1500,
      })
    }
    showModal.value = false
  } catch (error) {
    handleError(error, 'Gagal menyimpan data')
  }
}
</script>

<template>
  <VContainer>
    <!-- Modal Tambah/Edit -->
    <VDialog
      v-model="showModal"
      max-width="600"
    >
      <VCard class="pa-4">
        <VCardTitle class="text-h5">
          {{ modalType === 'add' ? 'Tambah Baru' : 'Edit Data' }}
        </VCardTitle>
        <VCardText>
          <VTextField
            color="info"
            v-model="currentRow.nama"
            label="Nama"
            class="mt-5"
          />
          <VTextField
            color="info"
            :model-value="formatCurrency(currentRow.dansos)"
            @update:model-value="newValue => (currentRow.dansos = parseCurrency(newValue))"
            label="Dansos"
            class="mt-4"
          >
            <template #prepend-inner>
              <span class="mr-2">Rp</span>
            </template></VTextField
          >

          <VTextField
            color="info"
            :model-value="formatCurrency(currentRow.kas)"
            @update:model-value="newValue => (currentRow.kas = parseCurrency(newValue))"
            label="Kas"
            class="mt-4"
          >
            <template #prepend-inner>
              <span class="mr-2">Rp</span>
            </template></VTextField
          >
        </VCardText>
        <VCardActions>
          <VBtn
            variant="elevated"
            v-if="modalType === 'edit'"
            color="error"
            @click="confirmDelete"
            prepend-icon="ri-delete-bin-line"
          >
            Hapus
          </VBtn>
          <VSpacer />
          <VBtn
            variant="outlined"
            color="secondary"
            @click="showModal = false"
            >Batal</VBtn
          >
          <VBtn
            variant="elevated"
            color="success"
            @click="saveRow"
            prepend-icon="ri-save-line"
            >Simpan</VBtn
          >
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal Konfirmasi Hapus -->
    <VDialog
      v-model="showDeleteConfirmation"
      max-width="500"
    >
      <VCard class="pa-4">
        <VCardTitle class="text-h5">Konfirmasi Hapus</VCardTitle>
        <VCardText>Apakah Anda yakin ingin menghapus data ini?</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            color="secondary"
            @click="showDeleteConfirmation = false"
            >Batal</VBtn
          >
          <VBtn
            color="error"
            @click="handleDelete"
            >Hapus</VBtn
          >
        </VCardActions>
      </VCard>
    </VDialog>

    <VCard class="pa-4">
      <VCardTitle class="text-info">Judul</VCardTitle>
      <VTextField
        color="info"
        id="judul"
        v-model="data.judul"
        placeholder="Tambahkan Judul"
        class="mt-2"
      />
    </VCard>

    <VCard
      variant="outlined"
      class="mt-3 pa-2"
    >
      <VCardTitle class="text-info">Laporan Dana</VCardTitle>
      <VRow class="my-1 align-center">
        <VCol
          cols="12"
          sm="8"
          md="9"
        >
          <VTextField
            v-model="searchQuery"
            label="Cari nama"
            color="info"
            placeholder="Ketik untuk mencari..."
            clearable
            density="compact"
            variant="outlined"
            prepend-inner-icon="ri-search-line"
          />
        </VCol>
        <VCol
          cols="12"
          sm="4"
          md="3"
        >
          <VBtn
            block
            color="success"
            prepend-icon="ri-add-fill"
            @click="openAddModal"
          >
            Tambah
          </VBtn>
        </VCol>
        <VCol>
          <p style="font-weight: bold">
            Jumlah DANSOS:
            <b class="text-info"
              >Rp
              {{
                formatCurrency(data.tabel.map(row => row.dansos).reduce((previous, current) => previous + current, 0))
              }}.-</b
            >
          </p>
          <p style="font-weight: bold">
            Jumlah Kas:
            <b class="text-info"
              >Rp
              {{
                formatCurrency(data.tabel.map(row => row.kas).reduce((previous, current) => previous + current, 0))
              }}.-</b
            >
          </p>
        </VCol>
      </VRow>
      <VCard
        :key="index"
        class="pa-2 py-4 mt-3"
      >
        <VRow>
          <VCol
            class="ml-2"
            style="max-width: 4rem"
            ><b>No.</b></VCol
          >
          <VCol style="border-left: 1px solid black"><b>Nama</b></VCol>
          <VCol style="border-left: 1px solid black"><b>DanSos (Rp)</b></VCol>
          <VCol style="border-left: 1px solid black"><b>Kas (Rp)</b></VCol>
        </VRow>
      </VCard>
      <VCard
        @click="openEditModal(row)"
        v-for="(row, index) in filteredRows"
        :key="index"
        class="pa-2 py-4 mt-3"
      >
        <VRow>
          <VCol
            class="ml-2"
            style="max-width: 4rem"
            >{{ index + 1 }}</VCol
          >
          <VCol style="border-left: 1px solid black">{{ row.nama }}</VCol>
          <VCol style="border-left: 1px solid black">{{ formatCurrency(row.dansos) }}</VCol>
          <VCol style="border-left: 1px solid black">{{ formatCurrency(row.kas) }}</VCol>
        </VRow>
      </VCard>
    </VCard>

    <VCard class="pa-4 mt-3">
      <VCardTitle class="text-info">Keterangan</VCardTitle>
      <div class="toolbar">
        <VBtn
          color="info"
          class="mr-3"
          variant="tonal"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <i class="ri-bold" />
        </VBtn>
        <VBtn
          color="info"
          class="mr-3"
          variant="tonal"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <i class="ri-italic" />
        </VBtn>
        <VBtn
          color="info"
          class="mr-3"
          variant="tonal"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <i class="ri-underline" />
        </VBtn>
      </div>
      <EditorContent
        :editor="editor"
        class="mt-4 editor-content"
      />
    </VCard>

    <div class="d-flex gap-3 mt-3 justify-end">
      <!-- Tombol Import JSON -->
      <VBtn
        color="secondary"
        prepend-icon="ri-upload-2-fill"
        @click="fileInput.click()"
      >
        Import JSON
      </VBtn>

      <!-- Input file hidden -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        hidden
        @change="handleFileImport"
      />
      <VBtn
        color="info"
        prepend-icon="ri-download-2-fill"
        @click="generatePDF"
      >
        Cetak PDF
      </VBtn>
    </div>
  </VContainer>
</template>

<style>
.ProseMirror {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  min-height: 8rem;
  font-family: sans-serif;
  font-size: 16px;
}
</style>
