<template>
    <div class="container mt-5">
        <div class="row">
        <div class="col-md-8 offset-md-2">
        <div class="form">
        <h1 class="textCenter">User Information Form / Credentials</h1>
        <form @submit.prevent="submitForm">
            <div class="row md-3">
                <div class="col-md-6">
                    <label for="username" class="form-label">Username:</label><br>
                    <input type="text" class="form-control" id="username" v-model="formData.username"><br>
                </div>
                <div class="col-md-6">
                    <label for="password" class="form-label">Password:</label><br>
                    <input type="password" class="form-control" id="password" v-model="formData.password"><br>
                </div>
            </div>
            <div class="row md-3">
                <div class="col-md-6">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="isAustralian" v-model="formData.isAustrlian">
                        <label class="form-check-label" for="isAustralian">Australian Resident?</label><br>
                    </div>
                </div>
                <div class="col-md-6">
                    <label for="gender" class="form-label">Gender</label><br>
                    <select class="form-select" id="gender"  v-model="formData.gender">
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
            <div class="row md-3">
                <label for="reason" class="form-label">Reason For Joining:</label><br>
                <textarea class="form-control" id="reason" rows="3"  v-model="formData.reason"></textarea><br>
            </div>
            <div class="text-center">
                <button type="submit" class="btn btn-primary me-2">submit</button>
                <button type="submit" class="btn btn-secondary" @click="clearForm">Clear</button>
            </div>
        </form>
        </div>
        </div>
        </div>
    </div>
</template>

<script setup>
// Our logic will go here
</script>

<style scoped>

</style>