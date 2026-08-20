<template>
    <div class="container mt-5">
        <div class="row">
        <div class="col-md-8 offset-md-2">
        <div class="form">
        <h1 class="textCenter">User Information Form / Credentials</h1>
        <form @submit.prevent="submitForm">
            <div class="row md-3">
                <div class="col-6">
                    <label for="username" class="form-label">Username:</label><br>
                    <input type="text" class="form-control" id="username" 
                    @blur="() => validateName(true)"
                    @input="() => validateName(false)"
                    v-model="formData.username"><br>
                    <div v-if="errors.username" class="text-danger">{{ errors.username }}</div>
                </div>
                <div class="col-6">
                    <label for="password" class="form-label">Password:</label><br>
                    <input type="password" class="form-control" id="password" 
                    @blur="() => validatePassword(true)"
                    @input="() => validatePassword(false)"
                    v-model="formData.password"><br>
                    <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
                </div>
            </div>
            <div class="row md-3">
                <div class="col-6">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="isAustralian" 
                        @blur="() => validateAustralian(true)"
                        @input="() => validateAustralian(false)"
                        v-model="formData.isAustralian">
                        <label class="form-check-label" for="isAustralian">Australian Resident?</label><br>
                    <div v-if="errors.isAustralian" class="text-danger">{{ errors.isAustralian }}</div>
                    </div>
                </div>
                <div class="col-6">
                    <label for="gender" class="form-label">Gender</label><br>
                    <select class="form-select" id="gender" 
                        @blur="() => validateGender(true)"
                        @input="() => validateGender(false)"
                        v-model="formData.gender">
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                    </select>
                    <div v-if="errors.gender" class="text-danger">{{ errors.gender }}</div>
                </div>
            </div>
            <div class="row md-3">
                <label for="reason" class="form-label">Reason For Joining:</label><br>
                <textarea class="form-control" id="reason" rows="3" 
                @blur="() => validateReason(true)"
                @input="() => validateReason(false)"
                v-model="formData.reason"></textarea><br>
                <div v-if="errors.reason" class="text-danger">{{ errors.reason }}</div>
            </div>
            <div class="text-center">
                <button type="submit" class="btn btn-primary me-2">submit</button>
                <button type="submit" class="btn btn-secondary" @click="clearForm">Clear</button>
            </div>
        </form>
        </div>
        </div>
        <div class="row mt-5" v-if="submittedCards.length">
        <div class="w-full">
            <DataTable :value="submittedCards" tableStyle="min-width: 50rem">
                <Column field="username" header="Username" />
                <Column field="password" header="Password" />
                <Column field="isAustralian" header="Austrlian Resident" />
                <Column field="gender" header="Gender" />
                <Column field="reason" header="Reason" />
            </DataTable>
        </div>
        </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';

    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    
    const formData = ref({
        username: '',
        password: '',
        isAustralian: false,
        reason: '',
        gender: ''
    });

    const submittedCards = ref([]);

    const submitForm = () => {
        validateName(true);
        validatePassword(true);
        validateGender(true);
        validateAustralian(true);
        validateReason(true);
        if (!errors.value.username && !errors.value.password && !errors.value.isAustralian && !errors.value.gender && !errors.value.reason) {
            submittedCards.value.push({ ...formData.value });
            clearForm();
        }
    };

    const clearForm = () => {
        formData.value = {
            username: '',
            password: '',
            isAustralian: false,
            reason: '',
            gender: ''
        };
    };

    const errors = ref({
        username: null,
        password: null,
        isAustralian: null,
        gender: null,
        reason: null,
    });

    const validateName = (blur) => {
        if (formData.value.username.length < 3) {
            if (blur) errors.value.username = "Name must be at least 3 characters";
        } else {
            errors.value.username = null;
        }
    }

    const validatePassword = (blur) => {
        const password = formData.value.password;
        const minLength = 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            if (blur) errors.value.password = `Password must be at least ${minLength} characters long.`;
        } else if (!hasUppercase) {
            if (blur) errors.value.password = "Password must contain at least one uppercase letter.";
        } else if (!hasLowercase) {
            if (blur) errors.value.password = "Password must contain at least one lowercase letter.";
        } else if (!hasNumber) {
            if (blur) errors.value.password = "Password must contain at least one number.";
        } else if (!hasSpecialChar) {
            if (blur) errors.value.password = "Password must contain at least one special character.";
        } else {
            errors.value.password = null;
        }
    };

    const validateAustralian = (blur) => {
        if (formData.value.isAustralian == false) {
            if (blur) errors.value.isAustralian = "Must be an Australian Resident."
        } else {
            errors.value.isAustralian = null;
        }
    }

    const validateGender = (blur) => {
        if (formData.value.gender == '') {
            if (blur) errors.value.gender = "Please select a gender."
        } else {
            errors.value.gender = null;
        }
    }

    const validateReason = (blur) => {
        if (formData.value.reason.length < 11) {
            if (blur) errors.value.reason = "Reason must be more than 10 characters."
        } else {
            errors.value.reason = null;
        }
    }
</script>

<style scoped>
   .card {
   border: 1px solid #ccc;
   border-radius: 10px;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
   }
   .card-header {
   background-color: #275FDA;
   color: white;
   padding: 10px;
   border-radius: 10px 10px 0 0;
   }
   .list-group-item {
   padding: 10px;
   }
</style>
